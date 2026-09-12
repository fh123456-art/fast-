import urllib.request, urllib.error, json

# 通过 vite 代理端口访问 /api(会转发到后端 8000)
VITE = 'http://localhost:2913'
BACK = 'http://localhost:8000'

# 1. 前端模块编译检查
mods = ['/src/api.js', '/src/views/Login.vue', '/src/views/Register.vue',
        '/src/views/Jobs.vue', '/src/views/ResumeManage.vue', '/src/views/Applications.vue',
        '/src/views/Profile.vue', '/src/views/Feedback.vue', '/src/router.js']
fail = 0
for m in mods:
    try:
        with urllib.request.urlopen(VITE + m, timeout=20) as r:
            if r.status != 200: fail += 1; print('COMPILE FAIL', m, r.status)
    except urllib.error.HTTPError as e:
        fail += 1; body = e.read().decode('utf-8')[:300]
        print('COMPILE ERROR', m, e.code, body)
print('=== module compile failures:', fail, '===')

# 2. 通过 vite 代理走 /api 完整链路
def call(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(VITE + '/api' + path, method=method, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

s, d = call('POST', '/auth/register', {'username': 'e2e', 'password': '123456', 'name': '端到端'})
print('via proxy register:', s)
s, d = call('POST', '/auth/login', {'username': 'e2e', 'password': '123456'})
print('via proxy login:', s, 'token?', bool(d.get('access_token')))
tok = d.get('access_token', '')
s, d = call('GET', '/jobs', token=tok)
print('via proxy jobs:', s, 'count=', len(d) if isinstance(d, list) else d)
s, d = call('POST', '/applications', {'job_id': 2}, tok)
print('via proxy apply:', s, d.get('msg'))
s, d = call('GET', '/applications', token=tok)
print('via proxy applications:', s, len(d))
print('=== E2E PROXY DONE ===')
