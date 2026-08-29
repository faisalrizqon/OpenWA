#coding: utf-8
import sys, json, os
sys.path.insert(0, '/www/server/panel/class')
os.chdir('/www/server/panel/class')
import public

project_name = 'mudahsewa_app'
project_cwd = '/www/wwwroot/dagdigdugdigicam.store'

count = public.M('sites').where('name=?', (project_name,)).count()
print('Existing count:', count)

if count == 0:
    pdata = {
        'name': project_name,
        'path': project_cwd,
        'ps': 'MudahSewa Next.js app (port 3000)',
        'status': 1,
        'type_id': 0,
        'project_type': 'Node',
        'project_config': json.dumps({
            'project_name': project_name,
            'project_cwd': project_cwd,
            'project_script': 'npm run start',
            'bind_extranet': 0,
            'domains': [],
            'is_power_on': 1,
            'run_user': 'www',
            'max_memory_limit': 600,
            'nodejs_version': 'v22.22.3',
            'port': 3000
        }),
        'addtime': public.getDate()
    }
    project_id = public.M('sites').insert(pdata)
    print('Inserted id:', project_id)
else:
    print('Already exists')

# Show current Node projects
rows = public.M('sites').where('project_type=?', 'Node').field('id,name,path,status').select()
print('Node projects:', rows)
