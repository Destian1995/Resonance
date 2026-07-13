// ============ INPUT — tap + drag pan ============
const Input = {
    mobile:false, tapped:false, tapX:0, tapY:0,
    // Camera drag
    dragging:false, dragId:-1, dragStartX:0, dragStartY:0, camStartX:0, camStartY:0,
    keys:{},

    init(c) {
        this.c=c; this.mobile=U.isMobile();
        window.addEventListener('keydown',e=>this.keys[e.code]=true);
        window.addEventListener('keyup',e=>this.keys[e.code]=false);

        // Mouse
        c.addEventListener('mousedown',e=>{
            this.tapped=true; this._sc(e);
            this.dragging=true; this.dragStartX=e.clientX; this.dragStartY=e.clientY;
            this.camStartX=Cam.x; this.camStartY=Cam.y;
        });
        c.addEventListener('mousemove',e=>{
            this._sc(e);
            if(this.dragging && !this.tapped){
                const dx=(e.clientX-this.dragStartX);
                const dy=(e.clientY-this.dragStartY);
                Cam.x=this.camStartX-dx; Cam.y=this.camStartY-dy;
            }
        });
        c.addEventListener('mouseup',e=>{
            if(this.dragging){
                const dx=Math.abs(e.clientX-this.dragStartX), dy=Math.abs(e.clientY-this.dragStartY);
                if(dx>8||dy>8) this.tapped=false; // was a drag, not a tap
            }
            this.dragging=false;
        });

        // Touch
        c.addEventListener('touchstart',e=>{
            e.preventDefault();
            const t=e.changedTouches[0], p=this._pos(t);
            this.tapped=true; this.tapX=p.x; this.tapY=p.y;
            this.dragging=true; this.dragId=t.identifier;
            this.dragStartX=t.clientX; this.dragStartY=t.clientY;
            this.camStartX=Cam.x; this.camStartY=Cam.y;
        },{passive:false});
        c.addEventListener('touchmove',e=>{
            e.preventDefault();
            for(const t of e.changedTouches){
                if(t.identifier===this.dragId){
                    const dx=(t.clientX-this.dragStartX);
                    const dy=(t.clientY-this.dragStartY);
                    if(Math.abs(dx)>5||Math.abs(dy)>5){
                        Cam.x=this.camStartX-dx; Cam.y=this.camStartY-dy;
                        this.tapped=false; // dragging cancels tap
                    }
                }
            }
        },{passive:false});
        c.addEventListener('touchend',e=>{e.preventDefault();this.dragging=false;this.dragId=-1;},{passive:false});
        c.addEventListener('touchcancel',e=>{e.preventDefault();this.dragging=false;},{passive:false});
    },
    _sc(e){const r=this.c.getBoundingClientRect();this.tapX=(e.clientX-r.left)*(this.c.width/r.width);this.tapY=(e.clientY-r.top)*(this.c.height/r.height);},
    _pos(t){const r=this.c.getBoundingClientRect();return{x:(t.clientX-r.left)*(this.c.width/r.width),y:(t.clientY-r.top)*(this.c.height/r.height)};},
    update(){
        // Keyboard camera pan
        const spd=6;
        if(this.keys.KeyW||this.keys.ArrowUp)Cam.y-=spd;
        if(this.keys.KeyS||this.keys.ArrowDown)Cam.y+=spd;
        if(this.keys.KeyA||this.keys.ArrowLeft)Cam.x-=spd;
        if(this.keys.KeyD||this.keys.ArrowRight)Cam.x+=spd;
    },
    endFrame(){this.tapped=false;}
};
