const assert=require('node:assert/strict');
async function main(){
 const targets=(await (await fetch('http://prometheus:9090/api/v1/targets')).json()).data.activeTargets;
 assert.equal(targets.length,5);for(const t of targets)assert.equal(t.health,'up',t.labels.job);
 async function query(q){const j=await(await fetch('http://prometheus:9090/api/v1/query?query='+encodeURIComponent(q))).json();assert.equal(j.status,'success');return j.data.result;}
 const cpu=await query('sum by(container_label_com_docker_compose_service)(rate(container_cpu_usage_seconds_total{container_label_com_docker_compose_project="de38nguyen",image!=""}[2m]))');
 const ram=await query('sum by(container_label_com_docker_compose_service)(container_memory_working_set_bytes{container_label_com_docker_compose_project="de38nguyen",image!=""})');
 for(const service of ['app','nginx','postgres']){assert(cpu.some(r=>r.metric.container_label_com_docker_compose_service===service),'CPU '+service);assert(ram.some(r=>r.metric.container_label_com_docker_compose_service===service),'RAM '+service);}
 const pg=await query('pg_up');assert(pg.some(r=>Number(r.value[1])===1));
 const result={passed:true,targets:targets.map(t=>({job:t.labels.job,health:t.health})),cpuServices:cpu.map(r=>r.metric.container_label_com_docker_compose_service),ramServices:ram.map(r=>r.metric.container_label_com_docker_compose_service),postgresUp:true,checkedAt:new Date().toISOString()};console.log(JSON.stringify(result,null,2));
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
