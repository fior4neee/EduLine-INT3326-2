# Infrastructure (M1 + M5)

## Local PostgreSQL (pgvector)
```bash
cd infrastructure
cp .env.example .env        # Windows: copy .env.example .env
docker compose up -d
docker compose ps           # chờ STATUS = healthy
```
Backend `.env`:
`DATABASE_URL=postgresql://eduline:eduline_dev@localhost:5432/eduline?schema=public`

Dừng: `docker compose down` (giữ dữ liệu) · Xoá sạch: `docker compose down -v`

Sau này: Terraform (GCP), k6 load test scripts.