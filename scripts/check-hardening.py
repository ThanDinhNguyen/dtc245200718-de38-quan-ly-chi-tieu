import json,subprocess
services=['app','nginx','postgres','pgadmin','prometheus','grafana','cadvisor','loki','promtail','nginx-exporter','postgres-exporter']
checks=[]
for service in services:
    c=json.loads(subprocess.check_output(['docker','inspect','de38nguyen-'+service+'-1']))[0]
    item={'service':service,'user':c['Config']['User'],'readonly':c['HostConfig']['ReadonlyRootfs'],'privileged':c['HostConfig']['Privileged'],'ports':c['HostConfig']['PortBindings'] or {}}
    if service in ['app','nginx','prometheus','grafana','loki','promtail','nginx-exporter','postgres-exporter']:
        assert item['user'] not in ['', '0', 'root','0:0'],service+' root'
        assert item['readonly'],service+' writable rootfs'
        assert 'no-new-privileges:true' in c['HostConfig']['SecurityOpt'],service
    if service in ['postgres','loki','promtail','cadvisor','nginx-exporter','postgres-exporter']:assert not item['ports'],service+' public ports'
    for bindings in item['ports'].values():
        for b in bindings or []:assert b['HostIp']=='127.0.0.1',service+' non-loopback port'
    checks.append(item)
n=json.loads(subprocess.check_output(['docker','network','inspect','de38nguyen_database']))[0];assert n['Internal']
print(json.dumps({'passed':True,'databaseInternal':True,'containers':checks,'exceptions':['cAdvisor privileged để đọc metrics host; không publish cổng','PostgreSQL/pgAdmin khởi tạo quyền theo image; tiến trình DB chạy postgres','Init và logrotate cần quyền quản lý file, tách khỏi ứng dụng']},ensure_ascii=False,indent=2))
