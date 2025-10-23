# MCPHub Kubernetes Deployment

This repository contains the Kubernetes deployment configuration for MCPHub.

## Quick Start

### Prerequisites
- Kubernetes cluster (FKS or any Kubernetes cluster)
- kubectl configured

### Deploy to Kubernetes

```bash
# Apply all Kubernetes configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=mcphub
kubectl get services
kubectl get ingress
```

### Access the Application

After deployment, MCPHub will be available at:
- **Internal**: `http://mcphub-service/` (within cluster)
- **External**: Update the host in `k8s/ingress.yaml` with your domain

## Configuration

The deployment includes:
- **ConfigMap**: MCP server configuration with playwright server
- **Deployment**: MCPHub application with 2 replicas
- **Service**: ClusterIP service exposing port 80
- **Ingress**: HTTP ingress for external access

### Environment Variables

The deployment configures:
- `PORT=3000`: Application port
- `BASE_PATH=""`: Base path for the application
- `REQUEST_TIMEOUT=60000`: Request timeout in milliseconds

## Customization

### Update Domain
Edit `k8s/ingress.yaml` and replace `mcphub.yourdomain.com` with your actual domain.

### Modify MCP Servers
Edit `k8s/configmap.yaml` to add or modify MCP server configurations.

### Scale Deployment
```bash
kubectl scale deployment mcphub --replicas=3
```

## Monitoring

- **Health check**: `/api/health`
- **Dashboard**: `http://your-domain/`
- **API endpoint**: `http://your-domain/mcp`

## Troubleshooting

```bash
# Check pod logs
kubectl logs -l app=mcphub

# Check pod status
kubectl describe pods -l app=mcphub

# Check service endpoints
kubectl get endpoints mcphub-service
```