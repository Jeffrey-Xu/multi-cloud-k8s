# S3 Static Website Frontend Architecture

## **Better Architecture: S3 + CloudFront Static Hosting**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STATIC FRONTEND ARCHITECTURE                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              CLIENT DELIVERY                                │ │
│  │                                                                             │ │
│  │  ┌─────────────┐    HTTPS     ┌─────────────┐    S3      ┌─────────────┐   │ │
│  │  │   Player    │─────────────►│ CloudFront  │───────────►│     S3      │   │ │
│  │  │   Browser   │              │    CDN      │            │   Bucket    │   │ │
│  │  │             │              │             │            │             │   │ │
│  │  │ • HTML/CSS  │              │ • Global    │            │ • Static    │   │ │
│  │  │ • JavaScript│              │   Edge      │            │   Files     │   │ │
│  │  │ • Assets    │              │ • Caching   │            │ • Builds    │   │ │
│  │  │             │              │ • SSL       │            │ • Assets    │   │ │
│  │  └─────────────┘              └─────────────┘            └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                     │                                                           │
│                     │ API Calls                                                 │
│                     ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              BACKEND SERVICES                               │ │
│  │                                                                             │ │
│  │  ┌─────────────┐    HTTPS     ┌─────────────┐    HTTP     ┌─────────────┐   │ │
│  │  │   Browser   │─────────────►│     ALB     │───────────►│ Kubernetes  │   │ │
│  │  │ JavaScript  │              │  (API Only) │            │  Services   │   │ │
│  │  │             │              │             │            │             │   │ │
│  │  │ • API Calls │              │ • /api/*    │            │ • Game      │   │ │
│  │  │ • WebSocket │              │ • /ws/*     │            │ • User      │   │ │
│  │  │ • Auth      │              │ • CORS      │            │ • Match     │   │ │
│  │  │             │              │ • Security  │            │ • Notify    │   │ │
│  │  └─────────────┘              └─────────────┘            └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Modified Frontend Configuration

### **1. Update Next.js for Static Export**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',           // ← Change from 'standalone' to 'export'
  trailingSlash: true,
  images: {
    unoptimized: true         // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.monopoly-game.com',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.monopoly-game.com',
  },
}

module.exports = nextConfig
```

### **2. Update Package.json Scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "export": "next build && next export",
    "deploy": "npm run export && aws s3 sync out/ s3://monopoly-frontend-bucket --delete"
  }
}
```

### **3. Create S3 Infrastructure**

```hcl
# Add to infra-dev/infrastructure/main.tf

# S3 bucket for frontend hosting
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-${var.environment}-frontend-${random_string.suffix.result}"
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      },
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.frontend.bucket}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for API calls (don't cache)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "https-only"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-frontend"
    Environment = var.environment
  }
}

# Additional origin for API calls
resource "aws_cloudfront_origin_access_control" "api" {
  name                              = "${var.project_name}-api-oac"
  description                       = "OAC for API calls"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## CI/CD Pipeline for S3 Deployment

### **Frontend CI Workflow**

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI/CD

on:
  push:
    paths:
      - 'monopoly/frontend/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: monopoly/frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd monopoly/frontend
        npm ci
    
    - name: Build static site
      run: |
        cd monopoly/frontend
        npm run build
      env:
        NEXT_PUBLIC_API_URL: https://api.monopoly-game.com
        NEXT_PUBLIC_WS_URL: wss://api.monopoly-game.com
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Deploy to S3
      run: |
        cd monopoly/frontend
        aws s3 sync out/ s3://monopoly-dev-frontend-bucket --delete
    
    - name: Invalidate CloudFront
      run: |
        aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## Architecture Benefits

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BENEFITS COMPARISON                                │
│                                                                                 │
│  KUBERNETES FRONTEND                    S3 STATIC FRONTEND                      │
│  ┌─────────────────────────────┐      ┌─────────────────────────────────┐       │
│  │ ❌ Higher costs (pods)       │      │ ✅ Lower costs (storage only)   │       │
│  │ ❌ Complex scaling           │      │ ✅ Infinite scaling             │       │
│  │ ❌ Server maintenance        │      │ ✅ No server maintenance        │       │
│  │ ❌ Single point of failure   │      │ ✅ Global CDN distribution      │       │
│  │ ✅ SSR capabilities          │      │ ❌ No SSR (client-side only)    │       │
│  │ ✅ API proxying              │      │ ❌ Direct API calls (CORS)      │       │
│  └─────────────────────────────┘      └─────────────────────────────────┘       │
│                                                                                 │
│  GAMING PLATFORM REQUIREMENTS:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ Real-time gameplay (WebSocket) - Both support                            │ │
│  │ ✅ Fast loading - S3+CloudFront wins                                       │ │
│  │ ✅ Global reach - S3+CloudFront wins                                       │ │
│  │ ✅ Cost efficiency - S3 wins                                               │ │
│  │ ✅ Scalability - S3 wins                                                   │ │
│  │ ❓ SEO requirements - Kubernetes wins (but gaming doesn't need SEO)        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Updated System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              OPTIMIZED ARCHITECTURE                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              FRONTEND LAYER                                 │ │
│  │                                                                             │ │
│  │  Player Browser ──► CloudFront CDN ──► S3 Static Website                   │ │
│  │  • Global edge locations            • Cached static assets                 │ │
│  │  • SSL termination                  • Instant loading                      │ │
│  │  • DDoS protection                  • No server costs                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│                                        │ API Calls                             │
│                                        ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              BACKEND LAYER                                  │ │
│  │                                                                             │ │
│  │  Application Load Balancer ──► Kubernetes Services                         │ │
│  │  • API endpoints only               • Game Engine                          │ │
│  │  • WebSocket support                • User Service                         │ │
│  │  • CORS configuration               • Matchmaking Service                  │ │
│  │  • Authentication                   • Notification Service                 │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## **Recommendation: YES, use S3 Static Website!**

**Benefits for Gaming Platform:**
- ✅ **Massive cost savings** (no frontend pods)
- ✅ **Global performance** (CloudFront edge locations)
- ✅ **Infinite scalability** (no server limits)
- ✅ **Zero maintenance** (managed service)
- ✅ **Perfect for gaming** (real-time via WebSocket to backend)

**Simple Migration:**
1. Change `output: 'export'` in Next.js config
2. Add S3 + CloudFront to Terraform
3. Update CI to deploy to S3 instead of Kubernetes
4. Remove frontend Kubernetes deployment

This is actually the **optimal architecture** for a gaming platform!
