# Nguyên Expense — Hệ thống Quản lý Chi tiêu

**Thân Đình Nguyên · DTC245200718 · CNTT K23D**
**Giảng viên hướng dẫn: Vũ Việt Dũng**
Đề 38 — Triển khai và Quản trị Hệ thống Phần mềm.

Ứng dụng quản lý thu/chi cá nhân hoặc một gia đình: giao dịch, danh mục, lọc và báo cáo. Stack Node.js 24, Express, EJS, PostgreSQL 17, pgAdmin và Nginx. Tiền VND nguyên; dữ liệu mẫu là minh họa.

## Chạy trên WSL Ubuntu-Lam

Cần WSL2 Ubuntu, Git, OpenSSL, Docker Engine đang chạy và Docker Compose plugin. Môi trường đã kiểm chứng là Ubuntu-Lam với Docker Engine native. Có thể clone vào thư mục Linux khác; đường dẫn dưới đây là ví dụ trên máy bàn giao. Tài khoản Linux cần quyền chạy Docker.

```sh
mkdir -p /home/lam/projects
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

## Log tập trung

Grafana → Explore → Loki. Chọn khoảng thời gian có demo hoặc kiểm thử:

```logql
{project="de38nguyen",job="nginx"} | json
{project="de38nguyen",job="app"} | json | event="login_failed"
{project="de38nguyen",job="app"} | json | event=~"transaction_(created|updated|deleted)"
```

Kiểm chứng cả ba truy vấn và luồng PostgreSQL:
```sh
docker compose -f compose.yaml -f compose.monitoring.yaml -f compose.logging.yaml exec -T app node < scripts/verify-logs.js
```

Chi tiết ở [observability/logql.md](observability/logql.md). Promtail được giữ theo đề; công cụ đã hết hỗ trợ từ 02/03/2026 ([Grafana](https://grafana.com/docs/loki/latest/send-data/promtail/)). Nên chuyển sang Alloy khi mở rộng triển khai.

## Kiểm thử và demo

```sh
sh scripts/test.sh
python3 scripts/check-hardening.py
```

Bộ kiểm thử tích hợp đi qua Nginx và PostgreSQL thật: tạo thu 10 triệu/chi 2 triệu, đối chiếu chênh lệch 8 triệu, sửa/xóa, lọc và báo cáo; đồng thời kiểm tra CSRF, XSS, SQL injection, đổi mật khẩu, thu hồi phiên và cập nhật cũ trả 409. Test dùng tài khoản QA tạm và ngày năm 2099, dọn dữ liệu sau khi chạy.

Demo: đăng nhập → thêm danh mục → thêm một khoản thu/chi cùng kỳ → xem báo cáo → sửa/xóa khoản chi → kiểm tra tổng mới. Dữ liệu ban đầu gồm 10 danh mục và 36 giao dịch minh họa trong ba tháng; seed chạy lại không nhân đôi hoặc đặt lại mật khẩu.

## Sao lưu và phục hồi

```sh
sh scripts/backup.sh
# Thay đường dẫn dưới đây bằng tệp .dump vừa tạo; giữ tệp .sha256 cùng thư mục.
sh scripts/restore.sh --verify-current .local/backups/<ten-ban-sao-luu>.dump
```

`--verify-current` phục hồi vào DB tạm rồi so sánh số dòng, tổng thu/chi và fingerprint với DB hiện tại. `--verify` chỉ yêu cầu bản sao lưu phục hồi được, cho phép dữ liệu khác hiện tại. DB tạm được xóa sau kiểm tra.

Khi cần thay dữ liệu đang dùng: `sh scripts/restore.sh --apply <tep.dump>`. Script yêu cầu gõ `PHUC HOI DE38`, dừng app/Nginx, rồi khôi phục; lỗi phục hồi giữ app dừng để xử lý. Mật khẩu người dùng theo bản sao lưu. Không dùng `--apply` chỉ để kiểm tra. Bản sao lưu chứa dữ liệu tài khoản/phiên; bảo vệ và lưu thêm một bản ngoài máy.

## Dừng khởi động lại và cấu hình cổng

```sh
sh scripts/stop.sh
sh scripts/start.sh
```

Các lệnh giữ volume và secret. Không xóa `.local/secrets` khi còn giữ DB vì mật khẩu trong DB không tự đổi theo tệp mới. Đổi mật khẩu website trong menu tài khoản; tệp mật khẩu khởi tạo không tự cập nhật.

Sao chép `.env.example` thành `.env` nếu cần đổi cổng. Mặc định chỉ bind localhost; PostgreSQL, Loki và exporter không publish cổng. Trong PowerShell có thể chạy `wsl -d Ubuntu-Lam -- bash -lc 'cd /home/lam/projects/de38-quan-ly-chi-tieu && sh scripts/start.sh'`; các lệnh khác tương tự.

## Xử lý sự cố

- Docker chưa chạy: kiểm tra `docker info`, trong Ubuntu dùng `sudo systemctl start docker`.
- Cổng đã dùng: đổi WEB_PORT/PGADMIN_PORT/GRAFANA_PORT/PROMETHEUS_PORT trong `.env`, chạy lại start.
- Kiểm tra dịch vụ: `docker compose -f compose.yaml -f compose.monitoring.yaml -f compose.logging.yaml ps`; dùng cùng bộ `-f` với `logs --tail 80 app postgres nginx`.
- Dashboard chưa có CPU: chờ ít nhất 30 giây; kiểm tra target rồi chạy `check-services.js`. Mặc định dashboard lọc project `de38nguyen`; nếu đổi tên project cần sửa nhãn trong dashboard và script kiểm tra.
- Log trống: chạy test hoặc thao tác demo, chọn thời gian gần đây trong Grafana, kiểm tra Promtail/Loki.
- pgAdmin: mở Servers → PostgreSQL Đề 38; host `postgres`, port `5432`, database `expense`, user `expense_migrate`; nhập mật khẩu từ `.local/secrets/db_migrate_password` nếu được hỏi.

## Giới hạn và bảo mật

Một tài khoản quản lý dùng chung, VND nguyên; chưa có nhiều thành viên, ngân sách hay kết nối ngân hàng. App/Nginx chạy non-root, rootfs chỉ đọc, CSRF, giới hạn đăng nhập, security headers và SQL có tham số. Tách vai trò owner/migrate/app/exporter; app không có quyền tạo bảng. cAdvisor privileged và init/logrotate quản lý quyền tệp là ngoại lệ vận hành, không áp dụng cùng chính sách với app.

Không đưa `.local`, `.env`, mật khẩu, backup hoặc báo cáo vào Git. Kế hoạch và tiêu chí nghiệm thu được ghi trong [6 GitHub Issues](https://github.com/ThanDinhNguyen/dtc245200718-de38-quan-ly-chi-tieu/issues?q=is%3Aissue).
