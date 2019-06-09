﻿/*
	execQue.js
	- que console commands
	- spawn commands asynchronously
	- provide callbacks: beforeExecute(job), afterExecute(job)
	- commands being executed have status dialogs in upper right of browser
	- kill jobs by clicking dialog


	vars
		ui.var.execQueMax:1,			//max simultaneous executions

	job = {
		command:string or function(job, callback)
		cmdType: 'function' or 'command', undefined === 'command', null === 'command'
		msg:string,		required, msg displayed when command executed
		cbBeforeExec: function(job){}
		cbAfterExec: function(job){}

		... custom data is ok ...

		//populated with:
		id: int				//time added to que
		queDuration: int
		execStart: int
		execDuration: int
		err: boolean			//(err != null) === an error occured
		stdout: string		//for cmdType=command
		stderr: string		//for cmdType=command
		args: array				//for cmdType=function, args is array of arguments returned from function call, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters
	}

	jobs = [job, ...]

*/


var dlgExecQ = null
var execQue = {

	active:[],			//list of active jobs; defined globally below
	idle:[],				//list of commands waiting to be executed
	paused:false,
	queTime:0,

	que: function(jobs){

		if(jobs === null)
			throw new Error('execQue() requires a jobs argument')

		if(Array.isArray(jobs) === false)
				jobs = [jobs]

		if(this.queTime === 0)
			this.queTime = ui.calc.timeStart()

		for(let job of jobs){

			if(job.msg == null)
				throw new Error(`execQue.que() error, job.msg is null.`)
			if(job.command == null)
				throw new Error(`execQue.que() error, job.command is null for [${job.msg}].`)
			//console.log('\nque:', job.msg)

			job.id = ui.calc.timeStart()			// used to calc job.queDuration
			job.active = false
			job.killed = false
			if(job.cmdType == null) job.cmdType = 'command'

			this.idle.push(job)
			this.queStatus()

			this.launch()
		}
	},
	launch: function(){
		if(this.idle.length === 0 && this.active.length === 0){
			this.queStatusDone()
			return
		}

		if(this.paused === true) return

		while( this.idle.length > 0 && this.active.length < ui.var.execQueMax){

			let job = this.idle.shift()
			this.queStatus()

			//console.log('launch:', job.msg)
			if(job.cbBeforeExec)
				job.cbBeforeExec(job)

			this.exec(job)
		}
	},
	exec: function(job){
		console.log(`execQue.exec:  ${job.msg}\n  ${job.command}`)

		job.execStart = ui.calc.timeStart()
		if(job.cmdType && job.cmdType === 'function'){
			job.process = job.command(job, function( ... args ){
				job.execDuration = ui.calc.timeEnd(job.execStart)
				console.log('   exec function done:', ui.calc.msecToStr(job.execDuration), job.msg)
				if(args.length === 1 && args[0] == null)
					args = []
				job.args = args
				execQue.deque(job)
			})
		}
		else {
			job.process = ui.calc.execAsync(job.command, function(err, stdout, stderr){
				//console.log('  exec result:', stdout)
				job.execDuration = ui.calc.timeEnd(job.execStart)
				job.err = err
				job.stdout = stdout
				job.stderr = stderr
				console.log('   exec done:', ui.calc.msecToStr(job.execDuration), job.msg)
				execQue.deque(job)
			})
		}
		this.activeAdd(job)
	},
	deque: function(job){

		this.activeRemove(job)

		if(job.killed===true){
			console.log(`exec job killed by user: "${job.msg}".`)
		} else
		if(job.err){
			console.log(`exec "${job.msg}" failed:`, job.err)
			alert(`"${job.msg}" failed:\n${job.err}.`)
		}

		if(job.cbAfterExec)
			job.cbAfterExec(job)

		//console.log('deque:', ui.calc.msecToStr(job.queDuration), job.msg)
		this.launch()
	},

	activeAdd: function(job){
		this.active.push(job)
		job.active = true

		let title = (job.cmdType === 'command'
							? `PID:${job.process.pid}, click to kill`
							: "Executing function, cannot kill")
		let click = (job.cmdType === 'command'
							? `onclick="execQue.jobKill(event)"`
							: '')
		job.ctrl = document.createElement('div')
		job.ctrl.innerHTML = `<div class=eqJobStatus data-jobid=${job.id}	${click}	title="${title}">
			${job.msg}
		</div>`

		dlgExecQ.appendChild(job.ctrl)
		return job
	},
	activeRemove: function(id){
		if(typeof id === 'object')
			id = id.id
		let found = false
		for(let ii in this.active){
			let job = this.active[ii]
			if(job.id == id){
				found = job
				this.active.splice(ii, 1)
				break
			}
		}
		if(found != false){

			found.active = false
			found.queDuration = ui.calc.timeEnd(found.id)

//				this.jobStatusDone(found)
			dlgFactory.fadeOut(found.ctrl, 0, 500, 500, true)		//removes ctrl from document
			this.queStatus()
		}
		return found
	},
	activeGet: function(id){
		for(let job of this.active){
			if(job.id == id)
				return job
		}
		return false
	},

	jobKill: function(event){
		let ctrl = event.target
		let job = this.activeGet(ctrl.dataset.jobid)
		if(job === false) return
		if(job.active === false) return
		if(job.killed === true) return
		if(job.process.killed) return

		if(!confirm(`Kill process (${job.process.pid}):\n`+job.msg)) return
		job.killed = true
		ui.calc.taskkill(job.process.pid)
	},

	queStatus: function(job){
		if(dlgExecQ !== null){
			dlgExecQ.querySelector('#eqLabel span').innerHTML = this.idle.length
		}
		else {
			//create dlg
			dlgExecQ = dlgFactory.tac2({
				to:{
					ctrl:document.body,
					from:'topright'
				},
				from:'topright',
				onClose:function(dlg, force){
					dlgExecQ = null
				},
				html:`
						<div id=divExecQue title='Commands being executed; ${ui.var.execQueMax} command(s) run at a time.'>
							<div id=eqLabel class=eqStatus>Remaining jobs: <span>${this.idle.length}</span></div>
							<div id=eqPause onclick="execQue.quePause()" class=eqStatus style="cursor:pointer;" title="Pausing que does not affect running jobs">Pause Que</div>
							<div id=eqStop onclick="execQue.queStop()" class=eqStatus style="cursor:pointer;" title="Stopping que does not affect running jobs">Stop Que</div>
						</div>
					`
				}
			)
		}

		if(this.paused === true) return

		let pp = dlgExecQ.querySelector('#eqPause'),
				ss = dlgExecQ.querySelector('#eqStop')
		if(this.idle.length === 0){
			pp.style.display = 'none'
			ss.style.display = 'none'
		}
		else {
			pp.style.display = 'block'
			ss.style.display = 'block'
		}
	},
	queStatusDone: function(){
		if(dlgExecQ == null) return

		this.queTime = ui.calc.timeEnd( this.queTime )
		console.log(`ExecQue done, duration: ${ui.calc.msecToStr(this.queTime)}.`)
		this.queTime = 0

		dlgFactory.close(dlgExecQ)
	},
	quePause(){
		this.paused = !this.paused
		let ctrl = dlgExecQ.querySelector('#eqPause')
		if(this.paused === true){
			ctrl.innerHTML = 'Resume Que'
			ctrl.style.backgroundColor = '#fdd'
			dlgFactory.bbl('Que Paused<br>Active jobs not affected.')
		}
		else {
			ctrl.innerHTML = 'Pause Que'
			ctrl.style.backgroundColor = '#eee'
		}
		if(this.paused === false)
			this.launch()
	},
	queStop(){
		if(!confirm('Confirm: Stop que?\n  This will not affect currently running jobs.')) return
		console.log("ExecQue stopped by user.")
		this.idle = []
		this.queStatus()
		this.launch()
	}

}