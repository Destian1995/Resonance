// ============ CAMERA ============
const Cam = {
    x:0,y:0,w:0,h:0,shake:0,sx:0,sy:0,
    init(w,h){this.w=w;this.h=h;},
    follow(t){this.x=t.x-this.w/2;this.y=t.y-this.h/2;},
    addShake(n){this.shake=Math.max(this.shake,n);},
    update(dt){if(this.shake>.3){this.sx=(Math.random()-.5)*this.shake;this.sy=(Math.random()-.5)*this.shake;this.shake*=.88;}else{this.shake=0;this.sx=0;this.sy=0;}},
    begin(ctx){ctx.save();ctx.translate(-this.x+this.sx,-this.y+this.sy);},
    end(ctx){ctx.restore();},
    screenToWorld(sx,sy){return{x:sx+this.x-this.sx,y:sy+this.y-this.sy};}
};
