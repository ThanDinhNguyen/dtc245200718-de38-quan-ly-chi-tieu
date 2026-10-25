# Giám sát Nguyên Expense

Prometheus có 5 job: prometheus, nguyen-expense, nginx, postgres và cadvisor. Dashboard Grafana dùng datasource UID nguyen-prometheus và nguyen-loki, thư mục Đề 38 Thân Đình Nguyên. Truy vấn container lọc Compose project de38nguyen.

Chờ ít nhất hai chu kỳ scrape 15 giây rồi chạy:
```sh
docker compose -f compose.yaml -f compose.monitoring.yaml -f compose.logging.yaml exec -T app node < scripts/check-services.js
docker compose -f compose.yaml -f compose.monitoring.yaml -f compose.logging.yaml exec -T app node < scripts/verify-logs.js
```

Script kiểm tra 5 target UP, CPU/RAM của app/nginx/postgres và pg_up. Bộ đếm HTTP/thao tác bắt đầu lại khi app restart; gauge số giao dịch đọc từ PostgreSQL. Alert ExpenseTargetDown được cấu hình trong Prometheus; chưa gửi thông báo ra dịch vụ bên ngoài.

cAdvisor có đặc quyền và đọc socket Docker/containerd để đo tài nguyên; đây là ngoại lệ hardening. Promtail không mount Docker socket. Chi tiết truy vấn nằm trong [logql.md](logql.md).
