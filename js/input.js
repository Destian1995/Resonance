// ============ INPUT — joystick + tap ============
const Input = {
    mobile:false, dx:0, dy:0, tapped:false, tapX:0, tapY:0,
    joy:{active:false,id:-1,bx:0,by:0,sx:0,sy:0},
    keys:{},

    init(c) {
        this.c=c; this.mobile=U.isMobile();
        window.addEventListener('keydown',e=>this.keys[e.code]=true);
        window.addEventListener('keyup',e=>this.keys[e.code]=false);
        c.addEventListener('mousedown',e=>{this.tapped=true;this._sc(e);});
        c.addEventListener('mousemove',e=>this._sc(e));
        c.addEventListener('touchstart',e=>this._ts(e),{passive:false});
        c.addEventListener('touchmove',e=>this._tm(e),{passive:false});
        c.addEventListener('touchend',e=>this._te(e),{passive:false});
        c.addEventListener('touchcancel',e=>this._te(e),{passive:false});
    },
    _sc(e){const r=this.c.getBoundingClientRect();this.tapX=(e.clientX-r.left)*(this.c.width/r.width);this.tapY=(e.clientY-r.top)*(this.c.height/r.height);},
    _pos(t){const r=this.c.getBoundingClientRect();return{x:(t.clientX-r.left)*(this.c.width/r.width),y:(t.clientY-r.top)*(this.c.height/r.height)};},
    _ts(e){e.preventDefault();for(const t of e.changedTouches){const p=this._pos(t);if(p.x<this.c.width*.4&&!this.joy.active){this.joy.active=true;this.joy.id=t.identifier;this.joy.bx=p.x;this.joy.by=p.y;this.joy.sx=p.x;this.joy.sy=p.y;}else{this.tapped=true;this.tapX=p.x;this.tapY=p.y;}}},
    _tm(e){e.preventDefault();for(const t of e.changedTouches){if(t.identifier===this.joy.id&&this.joy.active){const p=this._pos(t);const dx=p.x-this.joy.bx,dy=p.y-this.joy.by,d=Math.sqrt(dx*dx+dy*dy),max=CFG.JOY_R;if(d>CFG.JOY_DEAD){const cl=Math.min(d,max);this.dx=(dx/d)*(cl/max);this.dy=(dy/d)*(cl/max);this.joy.sx=this.joy.bx+(dx/d)*cl;this.joy.sy=this.joy.by+(dy/d)*cl;}else{this.dx=0;this.dy=0;this.joy.sx=this.joy.bx;this.joy.sy=this.joy.by;}}}},
    _te(e){e.preventDefault();for(const t of e.changedTouches){if(t.identifier===this.joy.id){this.joy.active=false;this.joy.id=-1;this.dx=0;this.dy=0;}}},

    update(){if(!this.mobile){let kx=0,ky=0;if(this.keys.KeyW||this.keys.ArrowUp)ky=-1;if(this.keys.KeyS||this.keys.ArrowDown)ky=1;if(this.keys.KeyA||this.keys.ArrowLeft)kx=-1;if(this.keys.KeyD||this.keys.ArrowRight)kx=1;if(kx&&ky){kx*=.707;ky*=.707;}this.dx=kx;this.dy=ky;}},
    endFrame(){this.tapped=false;},

    drawJoy(ctx){
        if(!this.mobile)return;
        if(this.joy.active){
            ctx.globalAlpha=.2;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(this.joy.bx,this.joy.by,CFG.JOY_R,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=.5;ctx.fillStyle='#0ff';ctx.beginPath();ctx.arc(this.joy.sx,this.joy.sy,16,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        }
    }
};
