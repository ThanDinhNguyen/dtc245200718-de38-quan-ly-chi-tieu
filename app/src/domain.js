'use strict';
const {pool}=require('./db');
class UserError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function id(v){if(!/^[1-9]\d{0,8}$/.test(String(v)))throw new UserError('Mã dữ liệu không hợp lệ.');return Number(v);}
function type(v){if(!['income','expense'].includes(v))throw new UserError('Vui lòng chọn thu hoặc chi.');return v;}
function amount(v){if(!/^[1-9]\d{0,14}$/.test(String(v)))throw new UserError('Số tiền phải là VND nguyên từ 1 đến 999.999.999.999.999.');return String(v);}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))throw new UserError('Ngày cần có định dạng năm-tháng-ngày.');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==v||v<'2000-01-01'||v>'2100-12-31')throw new UserError('Ngày giao dịch cần hợp lệ trong giai đoạn 2000–2100.');return v;}
function text(v,max,label,required=false){const s=String(v||'').trim();if(s.length>max||(required&&!s))throw new UserError(label+' '+(required?'cần có nội dung và ':'')+'không quá '+max+' ký tự.');return s;}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function period(q={},defaultMonth=false){
 let from=String(q.from||''),to=String(q.to||'');
 if(defaultMonth&&!from&&!to){from=today().slice(0,7)+'-01';const d=new Date(from+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);to=d.toISOString().slice(0,10);}
 if(from)date(from);if(to)date(to);if(from&&to&&from>to)throw new UserError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');return {from,to};
}
function filters(q={},defaultMonth=false){const p=period(q,defaultMonth);const f={...p,type:q.type?type(String(q.type)):'',category:q.category?String(id(q.category)):'',q:text(q.q,100,'Từ khóa'),page:q.page?id(q.page):1};return f;}
function where(f,alias='t'){
 const params=[],clauses=[];const add=(sql,v)=>{params.push(v);clauses.push(sql.replace('?',`$${params.length}`));};
 if(f.from)add(`${alias}.occurred_on >= ?::date`,f.from);if(f.to)add(`${alias}.occurred_on <= ?::date`,f.to);
 if(f.type)add(`${alias}.type = ?`,f.type);if(f.category)add(`${alias}.category_id = ?::int`,f.category);
 if(f.q)add(`(${alias}.note ILIKE ? ESCAPE '\\' OR c.name ILIKE $${params.length+1} ESCAPE '\\')`,'%'+f.q.replace(/[\\%_]/g,'\\$&')+'%');
 return {sql:clauses.length?' WHERE '+clauses.join(' AND '):'',params};
}
async function categories(){return (await pool.query('SELECT c.*,count(t.id)::int used FROM categories c LEFT JOIN transactions t ON t.category_id=c.id GROUP BY c.id ORDER BY c.type,c.name')).rows;}
async function transactions(f){const w=where(f),base=' FROM transactions t JOIN categories c ON c.id=t.category_id'+w.sql;const total=Number((await pool.query('SELECT count(*)'+base,w.params)).rows[0].count);const pages=Math.max(1,Math.ceil(total/12));f.page=Math.min(f.page,pages);const rows=(await pool.query('SELECT t.*,c.name category'+base+` ORDER BY t.occurred_on DESC,t.id DESC LIMIT 12 OFFSET $${w.params.length+1}`,[...w.params,(f.page-1)*12])).rows;return {rows,total,pages};}
async function report(f){const w=where(f),base=' FROM transactions t JOIN categories c ON c.id=t.category_id'+w.sql;
 const totals=(await pool.query("SELECT COALESCE(sum(t.amount_vnd) FILTER(WHERE t.type='income'),0)::text income,COALESCE(sum(t.amount_vnd) FILTER(WHERE t.type='expense'),0)::text expense,count(*)::int count"+base,w.params)).rows[0];totals.balance=String(BigInt(totals.income)-BigInt(totals.expense));
 const groups=(await pool.query('SELECT c.name,c.type,sum(t.amount_vnd)::text amount,count(*)::int count'+base+' GROUP BY c.id ORDER BY sum(t.amount_vnd) DESC',w.params)).rows;
 const months=(await pool.query("SELECT to_char(t.occurred_on,'YYYY-MM') AS \"month\",COALESCE(sum(t.amount_vnd) FILTER(WHERE t.type='income'),0)::text income,COALESCE(sum(t.amount_vnd) FILTER(WHERE t.type='expense'),0)::text expense"+base+" GROUP BY 1 ORDER BY 1",w.params)).rows;
 return {totals,groups,months};
}
async function saveTransaction(body,recordId){const values=[type(body.type),id(body.category_id),amount(body.amount_vnd),date(body.occurred_on),text(body.note,400,'Ghi chú')];let r;
 if(recordId)r=await pool.query('UPDATE transactions SET type=$1,category_id=$2,amount_vnd=$3,occurred_on=$4,note=$5,version=version+1,updated_at=now() WHERE id=$6 AND version=$7 RETURNING id',[...values,id(recordId),id(body.version)]);
 else r=await pool.query('INSERT INTO transactions(type,category_id,amount_vnd,occurred_on,note) VALUES($1,$2,$3,$4,$5) RETURNING id',values);
 if(!r.rowCount)throw new UserError('Giao dịch đã thay đổi hoặc bị xóa. Vui lòng tải lại trang.',409);return r.rows[0].id;
}
async function saveCategory(body,recordId){const values=[text(body.name,80,'Tên danh mục',true),type(body.type)];let r;
 if(recordId)r=await pool.query('UPDATE categories SET name=$1,type=$2,version=version+1 WHERE id=$3 AND version=$4 RETURNING id',[...values,id(recordId),id(body.version)]);
 else r=await pool.query('INSERT INTO categories(name,type) VALUES($1,$2) RETURNING id',values);
 if(!r.rowCount)throw new UserError('Danh mục đã thay đổi. Vui lòng tải lại trang.',409);return r.rows[0].id;
}
module.exports={UserError,id,type,amount,date,text,today,period,filters,where,categories,transactions,report,saveTransaction,saveCategory};
