const client=require('prom-client'),{pool}=require('./db');
const registry=new client.Registry();client.collectDefaultMetrics({register:registry,prefix:'nguyen_'});
const requests=new client.Counter({name:'expense_http_requests_total',help:'HTTP responses',labelNames:['method','route','status_code'],registers:[registry]});
const latency=new client.Histogram({name:'expense_http_request_duration_seconds',help:'Request latency',labelNames:['method','route'],buckets:[.005,.01,.025,.05,.1,.25,.5,1,2,5],registers:[registry]});
const actions=new client.Counter({name:'expense_actions_total',help:'Successful data changes',labelNames:['resource','action'],registers:[registry]});
new client.Gauge({name:'expense_transactions_total',help:'Persisted transactions',labelNames:['type'],registers:[registry],async collect(){const r=(await pool.query('SELECT type,count(*)::int n FROM transactions GROUP BY type')).rows;for(const type of ['income','expense'])this.set({type},r.find(x=>x.type===type)?.n||0);}});
function observe(req,res,next){const start=performance.now();res.on('finish',()=>{if(['/metrics','/healthz','/readyz'].includes(req.path))return;const route=String(req.route?.path||'unmatched');requests.inc({method:req.method,route,status_code:String(res.statusCode)});latency.observe({method:req.method,route},(performance.now()-start)/1000);});next();}
module.exports={registry,observe,actions};
