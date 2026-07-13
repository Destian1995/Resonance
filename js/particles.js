// ============ PARTICLES ============
const FX={
    list:[],rings:[],bolts:[],nums:[],flash:0,flashCol:'#fff',
    spawn(x,y,c,n,sp,l){if(this.list.length>800)return;n=n||4;sp=sp||60;l=l||.4;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=sp*(.5+Math.random()*.5);this.list.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:l*(.7+Math.random()*.3),ml:l,color:c,sz:2+Math.random()*3,glow:false});}},
    sparkle(x,y,c,n,sp){if(this.list.length>800)return;n=n||6;sp=sp||80;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=sp*(.3+Math.random()*.7);this.list.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.3,ml:.8,color:c,sz:3+Math.random()*3,glow:true});}},
    trail(x,y,c,s){if(this.list.length>800)return;this.list.push({x:x+(Math.random()-.5)*4,y:y+(Math.random()-.5)*4,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,life:.2,ml:.2,color:c,sz:s||2,glow:true});},
    ring(x,y,c,mr,d){this.rings.push({x,y,color:c,r:0,maxR:mr||80,life:d||.4,ml:d||.4});},
    bolt(x1,y1,x2,y2,c,l){const segs=[];for(let i=0;i<=6;i++){const t=i/6;segs.push({x:U.lerp(x1,x2,t)+(i>0&&i<6?(Math.random()-.5)*18:0),y:U.lerp(y1,y2,t)+(i>0&&i<6?(Math.random()-.5)*18:0)});}this.bolts.push({segs,color:c||'#4ef',life:l||.25,ml:l||.25});},
    num(x,y,t,c,big){this.nums.push({x:x+(Math.random()-.5)*8,y:y-8,text:String(t),color:c||'#fff',life:.9,ml:.9,vy:-65,big:!!big});},
    doFlash(c,i){this.flash=i||.3;this.flashCol=c||'#fff';},
    update(dt){
        for(let i=this.list.length-1;i>=0;i--){const p=this.list[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.91;p.vy*=.91;p.life-=dt;if(p.life<=0)this.list.splice(i,1);}
        for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;r.r=r.maxR*(1-r.life/r.ml);if(r.life<=0)this.rings.splice(i,1);}
        for(let i=this.bolts.length-1;i>=0;i--){this.bolts[i].life-=dt;if(this.bolts[i].life<=0)this.bolts.splice(i,1);}
        for(let i=this.nums.length-1;i>=0;i--){const d=this.nums[i];d.y+=d.vy*dt;d.vy*=.94;d.life-=dt;if(d.life<=0)this.nums.splice(i,1);}
        if(this.flash>0)this.flash=Math.max(0,this.flash-.02);
    },
    drawWorld(ctx){
        for(const r of this.rings){const a=U.clamp(r.life/r.ml,0,1);ctx.globalAlpha=a*.5;ctx.strokeStyle=r.color;ctx.lineWidth=3*a;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=a*.1;ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.fill();}
        for(const b of this.bolts){const a=U.clamp(b.life/b.ml,0,1);ctx.strokeStyle=b.color;ctx.lineWidth=4;ctx.globalAlpha=a*.3;ctx.beginPath();ctx.moveTo(b.segs[0].x,b.segs[0].y);for(let i=1;i<b.segs.length;i++)ctx.lineTo(b.segs[i].x,b.segs[i].y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.globalAlpha=a*.8;ctx.beginPath();ctx.moveTo(b.segs[0].x,b.segs[0].y);for(let i=1;i<b.segs.length;i++)ctx.lineTo(b.segs[i].x,b.segs[i].y);ctx.stroke();}
        ctx.globalAlpha=1;
        for(const p of this.list){const a=U.clamp(p.life/p.ml,0,1),s=p.sz*a;if(p.glow){ctx.globalAlpha=a*.4;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,s*1.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,s*.4,0,Math.PI*2);ctx.fill();}else{ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.fillRect(p.x-s/2|0,p.y-s/2|0,Math.ceil(s),Math.ceil(s));}}
        ctx.globalAlpha=1;
        for(const d of this.nums){const a=U.clamp(d.life/d.ml,0,1);ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.font=`bold ${d.big?15:11}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.text,(d.x|0)+1,(d.y|0)+1);ctx.fillStyle=d.color;ctx.fillText(d.text,d.x|0,d.y|0);}
        ctx.globalAlpha=1;
    },
    drawScreen(ctx,cw,ch){if(this.flash>.01){ctx.globalAlpha=this.flash;ctx.fillStyle=this.flashCol;ctx.fillRect(0,0,cw,ch);ctx.globalAlpha=1;}},
    clear(){this.list=[];this.rings=[];this.bolts=[];this.nums=[];this.flash=0;}
};
