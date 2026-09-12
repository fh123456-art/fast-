import urllib.request, urllib.error, json

B = 'http://localhost:8000'

def call(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(B + path, method=method, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

s, d = call('POST', '/auth/register', {'username': 'demo', 'password': '123456', 'name': '李同学', 'email': 'a@b.com'})
print('register:', s, d if s != 200 else 'ok')
s, d = call('POST', '/auth/login', {'username': 'demo', 'password': '123456'})
print('login:', s, 'token?', bool(d.get('access_token')))
tok = d['access_token']
s, d = call('GET', '/auth/me', token=tok)
print('me:', s, d.get('name'))
s, d = call('PUT', '/profile', {'school': '华南理工大学', 'major': '软件工程', 'intention': '前端开发', 'expect_city': '广州/深圳'}, tok)
print('profile update:', s, d.get('school'), d.get('major'))
s, d = call('GET', '/jobs', token=tok)
print('jobs count:', len(d))
s, d = call('GET', '/jobs?keyword=Vue', token=tok)
print('jobs keyword Vue:', len(d))
s, d = call('POST', '/jobs/1/collect', token=tok)
print('collect:', s, d.get('collected'))
s, d = call('GET', '/jobs/collected', token=tok)
print('collected list:', len(d))

# 文件上传(手写 multipart)
boundary = '----testboundary'
pdf = b'%PDF-1.4 fake resume content'
body = (
    ('--' + boundary + '\r\n').encode()
    + b'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n'
    + b'Content-Type: application/pdf\r\n\r\n'
    + pdf + b'\r\n'
    + ('--' + boundary + '--\r\n').encode()
)
req = urllib.request.Request(B + '/resumes/upload', data=body, method='POST',
                             headers={'Content-Type': 'multipart/form-data; boundary=' + boundary,
                                      'Authorization': 'Bearer ' + tok})
with urllib.request.urlopen(req) as resp:
    up = json.loads(resp.read().decode('utf-8'))
print('resume upload:', up['id'], up['status'], 'default=', up['isDefault'])
rid = up['id']
s, d = call('POST', '/resumes/%d/parse' % rid, token=tok)
print('ai parse:', s, d['parsed']['school'], 'suggestions:', len(d['suggestions']))
s, d = call('GET', '/resumes', token=tok)
print('resume list:', len(d), d[0]['status'])
s, d = call('POST', '/applications', {'job_id': 1}, tok)
print('apply:', s, d.get('msg'))
s, d = call('GET', '/applications', token=tok)
print('applications:', len(d), d[0]['jobTitle'])
s, d = call('POST', '/feedback', {'category': '简历诊断', 'fb_type': '建议', 'content': '希望支持照片识别'}, tok)
print('feedback:', s, d.get('msg'))
s, d = call('GET', '/feedback', token=tok)
print('my feedback:', len(d))
print('=== ALL OK ===')
