# Nguyên Expense — Hệ thống Quản lý Chi tiêu

**Thân Đình Nguyên · DTC245200718 · CNTT K23D**
**Giảng viên hướng dẫn: Vũ Việt Dũng**
Đề 38 — Triển khai và Quản trị Hệ thống Phần mềm.

Ứng dụng quản lý thu/chi cá nhân hoặc một gia đình: giao dịch, danh mục, lọc và báo cáo. Stack Node.js 24, Express, EJS, PostgreSQL 17, pgAdmin và Nginx. Tiền VND nguyên; dữ liệu mẫu là minh họa.

## Chạy trên WSL Ubuntu-Lam

Cài Docker Engine và Docker Compose plugin trong Ubuntu-Lam. Mã nguồn chính ở `/home/lam/projects/de38-quan-ly-chi-tieu`.

```sh
git clone https://github.com/ThanDinhNguyen/dtc245200718-de38-quan-ly-chi-tieu.git /home/lam/projects/de38-quan-ly-chi-tieu
cd /home/lam/projects/de38-quan-ly-chi-tieu
BASE_ONLY=1 sh scripts/start.sh
```

Website http://localhost:8038; pgAdmin http://localhost:8138. Website đăng nhập `admin`; lấy mật khẩu bằng `cat .local/secrets/admin_password`. pgAdmin: `admin@nguyen.edu.vn`, mật khẩu `.local/secrets/pgadmin_password`; kết nối database `expense`, host `postgres`, user `expense_migrate`, mật khẩu `.local/secrets/db_migrate_password`.

```sh
BASE_ONLY=1 sh scripts/test.sh
BASE_ONLY=1 sh scripts/stop.sh
```

Script sinh secret ngẫu nhiên, không ghi đè secret hoặc seed đã tồn tại. Dừng bình thường giữ dữ liệu. Giữ phiên Ubuntu-Lam mở trong buổi demo. HTTP localhost có security headers; khi triển khai Internet cần cấu hình HTTPS và cookie Secure.

Mã ứng dụng ở `app/`, cấu hình chạy ở `infra/` và Compose; lệnh vận hành ở `scripts/`. Báo cáo và ảnh minh chứng bàn giao riêng, không có trên GitHub.

## Giám sát hệ thống

Chạy `sh scripts/start.sh` để bật đầy đủ giám sát và log. Grafana http://localhost:3038, tài khoản `admin`, mật khẩu `.local/secrets/grafana_password`. Dashboard **Nguyên Expense | Tổng quan vận hành** tự nạp. Prometheus http://localhost:9138 có 5 target: ứng dụng, Nginx, PostgreSQL, cAdvisor và Prometheus.

```sh
docker compose -f compose.yaml -f compose.monitoring.yaml -f compose.logging.yaml exec -T app node < scripts/check-services.js
```

Chờ tối thiểu hai chu kỳ scrape (30 giây) để có CPU rate. Script xác nhận CPU/RAM thuộc đúng app, Nginx và PostgreSQL của project `de38nguyen`. cAdvisor được gắn Docker/containerd socket chỉ để đọc metadata và cần quyền privileged để đo tài nguyên; đây là ngoại lệ vận hành, không áp dụng cho ứng dụng.
