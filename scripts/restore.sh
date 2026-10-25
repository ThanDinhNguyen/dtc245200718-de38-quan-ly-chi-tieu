#!/bin/sh
set -eu
. "$(dirname -- "$0")/common.sh"
mode=${1:-}
case "$mode" in --verify|--verify-current|--apply) ;; *) echo 'Cách dùng: sh scripts/restore.sh --verify|--verify-current|--apply backup.dump'; exit 2;; esac
[ -n "${2:-}" ] && [ -f "$2" ] || { echo 'Không tìm thấy bản sao lưu.'; exit 2; }
backup=$(realpath -- "$2")
[ -f "$backup.sha256" ] || { echo 'Thiếu checksum.'; exit 2; }
(cd "$(dirname -- "$backup")" && sha256sum -c "$(basename -- "$backup").sha256")
pg(){ dc exec -T postgres sh -ec 'export PGPASSWORD="$(cat /run/secrets/db_owner_password)"; exec "$@"' sh "$@"; }
fingerprint(){ pg psql -h 127.0.0.1 -U expense_owner -d "$1" -At -v ON_ERROR_STOP=1 -c "SELECT json_build_object('categories',(SELECT count(*) FROM categories),'transactions',(SELECT count(*) FROM transactions),'income',(SELECT coalesce(sum(amount_vnd),0) FROM transactions WHERE type='income'),'expense',(SELECT coalesce(sum(amount_vnd),0) FROM transactions WHERE type='expense'),'fingerprint',md5(coalesce((SELECT string_agg(row_to_json(c)::text,'' ORDER BY id) FROM categories c),'')||coalesce((SELECT string_agg(row_to_json(t)::text,'' ORDER BY id) FROM transactions t),'')))::text"; }
verify_db="expense_restore_$(date +%s)_$$"
cleanup(){ pg dropdb -h 127.0.0.1 -U expense_owner --if-exists "$verify_db" >/dev/null; }
trap cleanup EXIT
pg createdb -h 127.0.0.1 -U expense_owner "$verify_db"
pg pg_restore -h 127.0.0.1 -U expense_owner --dbname="$verify_db" --no-owner --no-acl --exit-on-error <"$backup"
restored=$(fingerprint "$verify_db");current=$(fingerprint expense)
printf 'Bản phục hồi: %s\n' "$restored"
if [ "$restored" = "$current" ]; then echo 'PASS: Số dòng, tổng thu chi và fingerprint khớp dữ liệu hiện tại.'
elif [ "$mode" = --verify-current ]; then echo 'FAIL: Dữ liệu khác DB hiện tại.'; exit 1
else echo 'Bản sao lưu phục hồi được; nội dung khác DB hiện tại.'; fi
if [ "$mode" = --apply ]; then
 printf '%s\n' 'Thay dữ liệu hiện có bằng bản sao lưu. Nhập PHUC HOI DE38 để xác nhận:'
 read -r confirmation
 [ "$confirmation" = 'PHUC HOI DE38' ] || { echo 'Đã hủy.'; exit 1; }
 dc stop nginx app
 if pg pg_restore -h 127.0.0.1 -U expense_owner --dbname=expense --clean --if-exists --exit-on-error <"$backup"; then dc up -d --wait app nginx; echo 'Đã phục hồi. Mật khẩu tài khoản theo bản sao lưu.'
 else echo 'Phục hồi lỗi; giữ app/nginx dừng để xử lý.'; exit 1; fi
fi
