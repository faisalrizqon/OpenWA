import re

path = '/www/server/panel/class/acme_v2.py'
with open(path) as f:
    src = f.read()

old = '''        else:
            if re.match(r"^\\d+$", args.auth_to):
                import panelSite
                args.auth_to = find['path'] + '/' + panelSite.panelSite().GetRunPath(args)'''
new = '''        else:
            if not hasattr(args, 'auth_to'):
                args.auth_to = find['path']
            if re.match(r"^\\d+$", args.auth_to):
                import panelSite
                args.auth_to = find['path'] + '/' + panelSite.panelSite().GetRunPath(args)'''

if old in src:
    src = src.replace(old, new)
    with open(path, 'w') as f:
        f.write(src)
    print('PATCH 2 OK')
else:
    print('PATTERN NOT FOUND')
