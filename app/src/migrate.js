'use strict';
const fs=require('node:fs');
const {pool,tx,secret}=require('./db');
const {hashPassword}=require('./security');
async function main(){
 const passwordHash=await hashPassword(secret('ADMIN_PASSWORD_FILE'));
 await tx(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(380718)');
  await c.query(fs.readFileSync('/app/db/schema.sql','utf8'));
  await c.query('INSERT INTO admins(username,password_hash) VALUES($1,$2) ON CONFLICT DO NOTHING',['admin',passwordHash]);
  if(!(await c.query('SELECT 1 FROM seed_versions WHERE version=1')).rowCount){
   const cats=[['Lương & thu nhập','income'],['Làm thêm','income'],['Quà tặng','income'],['Ăn uống','expense'],['Di chuyển','expense'],['Nhà ở','expense'],['Mua sắm','expense'],['Học tập','expense'],['Sức khỏe','expense'],['Giải trí','expense']];
   const ids=[];for(const cat of cats)ids.push((await c.query('INSERT INTO categories(name,type) VALUES($1,$2) RETURNING id',cat)).rows[0].id);
   for(let m=0;m<3;m++){
    for(const [cat,amount,day,note] of [[0,15000000,1,'Lương tháng — dữ liệu minh họa'],[1,2200000,12,'Dự án làm thêm'],[3,125000,3,'Đi chợ đầu tuần'],[3,85000,8,'Bữa trưa gia đình'],[4,300000,5,'Xăng xe'],[5,3500000,2,'Tiền thuê nhà'],[6,650000,14,'Đồ dùng gia đình'],[7,420000,16,'Sách và khóa học'],[8,180000,18,'Khám sức khỏe'],[9,250000,20,'Cuối tuần cùng gia đình'],[3,210000,23,'Thực phẩm'],[2,500000,25,'Quà tặng sinh nhật']]){
     await c.query("INSERT INTO transactions(type,category_id,amount_vnd,occurred_on,note) VALUES($1,$2,$3,(date_trunc('month',CURRENT_DATE)-($4::int * interval '1 month')+($5::int-1)*interval '1 day')::date,$6)",[cats[cat][1],ids[cat],String(amount),m,day,note]);
    }
   }
   await c.query('INSERT INTO seed_versions(version) VALUES(1)');
  }
  await c.query('GRANT SELECT,INSERT,UPDATE,DELETE ON admins,sessions,categories,transactions TO expense_app');
  await c.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO expense_app');
 });
 console.log('Schema and seed ready; existing data and passwords preserved.');
}
main().catch(e=>{console.error('Migration failed:',e.code||e.message);process.exitCode=1;}).finally(()=>pool.end());
