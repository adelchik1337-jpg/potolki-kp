# сборка: исходники → gh-potolki/index.html (+ копия исходников в gh-potolki/src)
import os, shutil, re
S=os.path.dirname(os.path.abspath(__file__))
O=S+'/gh-potolki' if os.path.isdir(S+'/gh-potolki') else os.path.dirname(S)  # из scratchpad или из src/ репозитория
css=open(S+'/potolki-css.txt').read(); b=open(S+'/potolki-body.html').read()
d=open(S+'/potolki-data.js').read(); pr=open(S+'/potolki-profile.js').read(); a=open(S+'/potolki-app.js').read()
mark=open(S+'/mark.svg').read()
from urllib.parse import quote
fav='data:image/svg+xml,'+quote(mark)
URL='https://adelchik1337-jpg.github.io/potolki-kp/'
head=('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
 '<title>Натяжной потолок — коммерческое предложение «Высокий уровень»</title>\n'
 '<link rel="icon" href="'+fav+'">\n'
 '<meta property="og:title" content="Натяжной потолок — коммерческое предложение">\n'
 '<meta property="og:description" content="«Высокий уровень», Новороссийск: смета, разрез потолка, наши объекты и видео.">\n'
 '<meta property="og:image" content="'+URL+'media/og.jpg">\n<meta property="og:type" content="website">\n')
html=head+css+'\n'+b+'\n<script>\n'+d+'\n'+pr+'\n'+a+'\n</script>\n'
open(O+'/index.html','w').write(html)
if os.path.abspath(S)!=os.path.abspath(O+'/src'):
  os.makedirs(O+'/src',exist_ok=True)
  for f in ['potolki-css.txt','potolki-body.html','potolki-data.js','potolki-profile.js','potolki-app.js','build.py','mark.svg']: shutil.copy(S+'/'+f,O+'/src/'+f)
print('index.html', len(html)//1024,'KB')
