# Mathematical Notes
A point p=(x,y,z) uses homogeneous position (x,y,z,1); a direction uses w=0. Clip point is P·V·M·p.

For vertical field of view θ, aspect a, near n and far f, q=1/tan(θ/2):
P00=q/a, P11=q, P22=-(f+n)/(f-n), P23=-2fn/(f-n), P32=-1.
After perspective divide, NDC=(xc/wc,yc/wc,zc/wc).

Triangle coverage uses signed edge functions and barycentric weights. For pixel centre p:
λ0=E(v1,v2,p)/E(v1,v2,v0), λ1=E(v2,v0,p)/A, λ2=1-λ0-λ1.
A fragment is inside when all weights are non-negative for the chosen winding.
Depth is mapped from NDC [-1,1] to [0,1]; smaller depth wins.
