class BlocksColumn extends egret.Sprite {
    public constructor(param: any) {
        super();
        this.dir = param.dir;
        this._dir = this.dir;
        this.name = param.name;
        this.blockWeightNumber = param.blockWeightNumber;
        this._speedUpInterval = param.speedUpInterval * 1000;
        this._index = parseInt(this.name.split("_")[1], 10);
        this._draw();
    }
    private _blocks: Array<any> = [];
    private _dir: string;
    private _index: number;
    private _creatingRowIndex: number = 0;
    private _speedUpTimer: egret.Timer;
    private _speedLevel: number = 0;
    private _speedUpInterval: number;
    private _speedTick: boolean = false;
    private _reverseTimer: egret.Timer;
    private _shrinkRate:number = 1;
    private _blockWeightNumber:Array<number>;

    public speed: number = Service.GAME_CONFIG.speedLevels[this._speedLevel];
    public dir: string;

    private _draw() {
        this._blocks = [];
        let n: number = this._dir === "down" ? -1 : 0;
        let blockCount = this._dir === "down" ? Utils.rows : Utils.rows + 1;
        for (let i = n; i < blockCount; i++) {
            let state:number = BlockState.unclickable;
            this._creatingRowIndex = this._dir === "down" ? i + 1 : i;
            if ((this._dir === "down" && i === -1) || (this._dir === "up" && i === blockCount - 1)) {
                state = Utils.getRowBlockState(this._creatingRowIndex)[
                    this._index
                ]
            }
            const block = this._createBlock({
                state: state,
                startBlock: true
            });
            this.addChild(block);
            block.x = 0;
            block.y = i * block.height;
            this._blocks.push(block);
        }
    }
    public reset(){
        this.stop();
        this.speedLevel = 0;
        this._dir =  this.dir;
        this.shrinkReset();
        const blockLength =  this._blocks.length;
        for (let i = 0; i < blockLength; i++) {
            this.removeChild(this._blocks[i]);
            this._blocks[i] = null;
        }
        this._draw();
    }
    private _createBlock(settings: any): any {
        let blockWidth: number = Utils.getBlockWidth();
        let blockHeight: number = Utils.getBlockHeight();
        let param: any = {
            width: blockWidth,
            height: blockHeight,
            shrinkRate: this._shrinkRate,
            state: settings.state
        };
        // let block = new BlockNormal(param);
        // let block = new BlockDouble(param);
        // let block = new BlockRush(param);
        // let block = new BlockBlink(param);
        let block:any;
        if (settings.startBlock == null && settings.state === BlockState.clickable) {
            let weightArray = [];
            for (const key in this._blockWeightNumber) {
                if (this._blockWeightNumber.hasOwnProperty(key)) {
                    const weight = this._blockWeightNumber[key];
                    for (let index = 0; index < weight; index++) {
                        weightArray.push(BlockType[key]);
                    }
                }
            }
            if (weightArray.length !== 10) {
                weightArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
            const weightNumbers = weightArray;//[0, 0, 0, 0, 0, 1, 1, 2, 3, 4]
            const idx = Math.floor(Math.random() * weightNumbers.length);
            const blockType:number = weightNumbers[idx];
            block = new window[BlockType[blockType]](param);
        }else{
            block = new BlockNormal(param);
        }

        block.addEventListener(
            GameEvents.BlockEvent.MOVED_OUT,
            this._onMovedOut,
            this
        );
        return block;
    }
    private _onMovedOut(evt: GameEvents.BlockEvent) {
        let tarBlock: BlockBase = evt.target;
        // let missed: boolean = evt.missed;
        let missed: boolean = false;
        tarBlock.removeEventListener(
            GameEvents.BlockEvent.MOVED_OUT,
            this._onMovedOut,
            this
        );
        if (this._dir === "down") {
            this._blocks.pop();
        } else {
            this._blocks.shift();
        }

        tarBlock.stop();
        this.removeChild(tarBlock);
        tarBlock = null;
        if (missed) {
            this.stop();
        } else {
            let newBlock: BlockBase = this._createBlock({
                state: Utils.getRowBlockState(this._creatingRowIndex)[
                    this._index
                ]
            });
            this._creatingRowIndex++;
            this.addChild(newBlock);
            if (this._dir === "down") {
                newBlock.y = this._blocks[0].y - newBlock.height + this.speed;
            } else {
                newBlock.y =
                    this._blocks[this._blocks.length - 1].y +
                    newBlock.height -
                    this.speed;
            }
            newBlock.move(this.speed, this._dir);
            if (this._dir === "down") {
                this._blocks.unshift(newBlock);
            } else {
                this._blocks.push(newBlock);
            }
        }
    }
    private _speedLooper() {
        if (this._speedTick) {
            this._slowDown();
        } else {
            this._speedUp();
        }
    }
    private _speedUp() {
        if (this._speedLevel < Service.GAME_CONFIG.speedLevels.length) {
            this.speed = Service.GAME_CONFIG.speedLevels[this._speedLevel];
            this.updateSpeed();
            this._speedLevel++;
        }
        if (this._speedLevel === Service.GAME_CONFIG.speedLevels.length) {
            this._speedTick = true;
        }
    }
    private _slowDown() {
        if (this._speedLevel > 0) {
            this._speedLevel--;
            this.speed = Service.GAME_CONFIG.speedLevels[this._speedLevel];
            this.updateSpeed();
        }
        if (this._speedLevel === 0) {
            this._speedTick = false;
            this._reversePause();
        }
    }
    private _revertDir() {
        if (this._dir === "up") {
            this._dir = "down";
        } else {
            this._dir = "up";
        }
    }
    private _reversePause() {
        this.stop();
        if (this._reverseTimer === undefined) {
            this._reverseTimer = new egret.Timer(2000, 1);
            this._reverseTimer.addEventListener(
                egret.TimerEvent.TIMER_COMPLETE,
                function() {
                    this._revertDir();
                    this.move();
                },
                this
            );
        }
        this._reverseTimer.reset();
        this._reverseTimer.start();
    }
    private _blockSizeUpdate(){
        for (let i = 0; i < this._blocks.length; i++) {
            const blockInstance = this._blocks[i];
            blockInstance.shrinkRate = this._shrinkRate;
            blockInstance.sizeUpdate();
        }
    }
    public updateSpeed() {
        let blocks: Array<any> = this._blocks;
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].speed = this.speed;
        }
    }
    public startSpeedUpTimer() {
        this._speedUpTimer = new egret.Timer(this._speedUpInterval, 0);
        //注册事件侦听器
        this._speedUpTimer.addEventListener(
            egret.TimerEvent.TIMER,
            this._speedLooper,
            this
        );
        this._speedUpTimer.start();
    }
    public stopSpeedUpTimer() {
        if (this._speedUpTimer !== null) {
            this._speedUpTimer.stop();
            this._speedUpTimer.removeEventListener(
                egret.TimerEvent.TIMER,
                this._speedLooper,
                this
            );
            this._speedUpTimer = null;
        }
    }
    public move() {
        let blocks: Array<any> = this._blocks;
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].move(this.speed, this._dir);
        }
        this.startSpeedUpTimer();
    }
    public stop() {
        for (let i = 0; i < this._blocks.length; i++) {
            this._blocks[i].stop();
        }
        this.stopSpeedUpTimer();
    }
    public shrink() {
        this._shrinkRate = 0.5;
        this._blockSizeUpdate();
    }
    public shrinkReset() {
        this._shrinkRate = 1;
        this._blockSizeUpdate();
    }

    /**
     * get speedLevel
     */
    public get speedLevel():number {
        return this._speedLevel;
    }
    /**
     * set speedLevel
     */
    public set speedLevel(val:number) {
        this._speedLevel = val;
        this.speed = Service.GAME_CONFIG.speedLevels[this._speedLevel];
    }

    /**
     * set blockWeightNumber
     * @param val weight array
     *
     */
    public set blockWeightNumber(val:Array<number>) {
        this._blockWeightNumber = val;
    }
    /**
     * get blockWeightNumber
     * @param val weight array
     *
     */
    public get blockWeightNumber():Array<number> {
        return this._blockWeightNumber;
    }
}
