# Truy vấn LogQL của Nguyên Expense

Mở Grafana → Explore → datasource Loki, chọn cửa sổ thời gian có demo hoặc kiểm thử. Ba truy vấn sau được script `scripts/verify-logs.js` kiểm chứng có dữ liệu.

## 1. Truy cập HTTP qua Nginx
```logql
{project="de38nguyen",job="nginx"} | json
```
Thêm `| status >= 400` để tìm phản hồi lỗi nếu có.

## 2. Đăng nhập thất bại
```logql
{project="de38nguyen",job="app"} | json | event="login_failed"
```

## 3. Thao tác giao dịch thu chi
```logql
{project="de38nguyen",job="app"} | json | event=~"transaction_(created|updated|deleted)"
```

Luồng PostgreSQL: `{project="de38nguyen",job="postgres"}`. Thêm `| json | error_severity=~"ERROR|FATAL|PANIC"` nếu cần tìm lỗi; truy vấn lọc lỗi có thể rỗng khi DB hoạt động bình thường.

Chạy `sh scripts/test.sh` tạo sự kiện kiểm chứng và dọn dữ liệu nghiệp vụ thử. Mật khẩu, cookie, nội dung form và ghi chú giao dịch không được ghi trong log ứng dụng. Promtail đọc volume log chỉ đọc, không mount Docker socket. Logrotate xoay vòng tệp; Loki giữ dữ liệu 7 ngày. Promtail đã hết hỗ trợ từ 02/03/2026, giữ theo yêu cầu đề bài; hướng nâng cấp là Grafana Alloy.
