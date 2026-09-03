# Optional, temporary AWS laboratory

This is an EC2/SSM Docker host blueprint, not an already provisioned deployment. It uses an existing public subnet and VPC; no NAT gateway, ALB, RDS or Kubernetes. It does not create a paid dependency for Orbit.

EC2, public IPv4, EBS and traffic can incur charges. Check your account's eligibility and prices before `apply`. A stopped instance still has billable resources. `destroy` removes the lab's root volume; export any data first. Use demo data only.

1. Authenticate AWS locally with an appropriate short-lived role. Do not commit credentials or state.
2. `terraform init` and `terraform plan -var='vpc_id=YOUR_VPC' -var='subnet_id=YOUR_SUBNET' -var='allowed_cidr=YOUR_IP/32'`.
3. Review costs and the plan before applying. The subnet must route to an Internet Gateway for registry access and SSM.
4. Open AWS Systems Manager Session Manager for the output instance ID (no inbound SSH). Docker is installed by user-data.
5. Copy a private runtime env file into `/opt/orbit`, mode 600, and a versioned/pinned Orbit image reference. Use a separate persistent PostgreSQL database and configured OIDC issuer.
6. Run the migration once: `docker run --rm --env-file /opt/orbit/.env IMAGE alembic upgrade head`.
7. Run the app: `docker run -d --name orbit --restart unless-stopped --env-file /opt/orbit/.env -p 127.0.0.1:8080:8080 IMAGE`.
8. For a real HTTPS demo, point a DNS name you control at the instance and configure a Caddy reverse proxy to localhost:8080. Use DNS-01 with scoped DNS credentials while inbound access remains restricted, or perform a deliberately reviewed security-group change for certificate validation. Never send personal tokens over plain HTTP.
9. Validate the same app journeys, capture measured evidence, then `terraform destroy`. Check for resources created outside this module separately.

The frontend and API use the same URL. AWS execution is intentionally manual and not part of free CI. The application also deploys without this laboratory via the root Docker Compose or Render blueprint.

References: [EC2 Terraform resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance), [SSM instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html).
