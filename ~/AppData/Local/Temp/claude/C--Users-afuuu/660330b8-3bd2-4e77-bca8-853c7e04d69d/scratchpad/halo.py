import sys, numpy as np
from PIL import Image
from scipy import ndimage
def temizle(yol, alt=0.30, iters=5, esik=165, yaz=True):
    im=Image.open(yol); mode=im.mode; a=np.array(im.convert("RGBA")).astype(np.int32)
    h,w=a.shape[:2]; y0=int(h*(1-alt))
    toplam=0
    for _ in range(iters):
        al=a[...,3]; rgb=a[...,:3]
        seffaf=al<10
        komsu=ndimage.binary_dilation(seffaf, structure=np.ones((3,3)))
        parlak=(rgb.min(-1)>esik)|((rgb[...,2]>200)&(rgb[...,1]>170)&(rgb[...,0]>120))
        m=komsu & ~seffaf & parlak
        m[:y0]=False
        n=int(m.sum());
        if n==0: break
        a[m,3]=0; toplam+=n
    # 1px yumusak kenar: yeni seffafa komsu opak piksellerin alfasini hafif dusur
    if toplam:
        al=a[...,3]; seffaf=al<10
        kenar=ndimage.binary_dilation(seffaf,structure=np.ones((3,3))) & ~seffaf
        kenar[:y0]=False
        a[kenar,3]=np.minimum(a[kenar,3],200)
    if yaz and toplam:
        Image.fromarray(a.astype(np.uint8),"RGBA").save(yol, lossless=True, quality=100, method=6) if yol.lower().endswith(".webp") else Image.fromarray(a.astype(np.uint8),"RGBA").save(yol)
    return toplam
if __name__=="__main__":
    for y in sys.argv[1:]:
        print(y, temizle(y))
