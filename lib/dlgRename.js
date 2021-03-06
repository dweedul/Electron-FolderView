﻿/*
	dlgRename.js
	- a simple implementation to move code out of renderer.js quickly
	- if item is image, open gallery

	usage:
		dlgRenameCreate(control.id)
		- control is a grid item

	requires
		- ui.js
		- actionMap.js	// record/playback selection actions

*/
var dlgRename = null

function dlgRenameCreate(controlId) {
	if(dlgRename != null) return

	const path = require('path');
	const fs = require('fs');

	if(ui.var.dlgRenameLoadInc === undefined) //only set in this func
		initUiVars()

	var obj = controlIdToObj(controlId)
	var fn = path.basename(obj.path)
	var ext = path.extname(obj.path)
	var fnnew=fn	//ui.calc.strInc(fn)

	ui.var.dlgRenameEd=null		//reset each call
	ui.var.dlgRenameSelRepeat=null
	ui.var.dlgRenameKeepExt= (obj.isDirectory === false)		//default: if file then true

	dlgRename = dlgFactory.create({	//rename dlg
		attrib:{ className:'dlgRename', style:{zIndex:1500}},
		canDestroy:true,
		focusId: '#inpRNNew',
		title:'Rename File',
		width:'51em',
		onClose:function(dlg,force){
			if(galleryClose(dlgRename.id)===false){
				if(gallery != null)
					document.querySelector('#pswpMain').focus()
			}
			dlgRename = null
		},
		body: `<style>
					.dlgRename .dlgBody .dlgButton{ border-radius:2px; font-size:1em; }
					.divRenameHover{ background:beige; border:1px solid silver; border-top:none; box-shadow:1px 1px 1px #2f2f2f; font-size:1em; padding:0.5em; margin:1px 0 0 3px; z-index:1600; }
					.divRenameHover label{ display:block; }
					</style>
					<label style="display:block;margin-top:0.5em">
						Old name <br>
						<input id=inpOld type=text value="${fn}" readonly style='background:#ddd; color:#000; border:1px solid silver; text-align:left; width:45em;'>
					</label>
					<label style="display:block;margin:0.5em 0 0.5em 0">
						New name<br>
					 	<textarea id=inpRNNew onclick="ui.var.dlgRenameEd=this;" type=text style='font-family:Arial; text-align:left; width:44.7em;' tabindex=0 autocomplete=off spellcheck=false >${fnnew}</textarea>
					</label>
					<button class='el el-plus dlgButton' onclick="ui.var.dlgRenameInc(event)" title="Increment the new filename"></button> </label>
					<button class='el el-minus dlgButton' onclick="ui.var.dlgRenameDec(event)" title="Decrement the new filename"></button> </label>
					<button class='el el-plus-sign dlgButton' onclick="ui.var.dlgRenameLoadInc(event)" title="Load and increment the last filename used"></button>
					&nbsp; &nbsp;
					<button class='el el-circle-arrow-right dlgButton' title="Select/deselect right to next whitespace char" onmousedown="ui.var.dlgRenameSelMoveRightWs(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					<button class='el el-arrow-right dlgButton' title="Select/deselect right, hold to repeat" onmousedown="ui.var.dlgRenameSelMoveRight(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					<button class='el el-remove dlgButton' title="Delete selection" onclick="ui.var.dlgRenameSelClear(event)"></button>
					<button class='el el-arrow-left dlgButton' title="Select/deselect left, hold to repeat" onmousedown="ui.var.dlgRenameSelMoveLeft(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					<button class='el el-circle-arrow-left dlgButton' title="Select/deselect left to next whitespace char" onmousedown="ui.var.dlgRenameSelMoveLeftWs(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					<button class='el el-chevron-left dlgButton' title="Auto select left" onmousedown="ui.var.dlgRenameSelMoveLeftAuto(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					&nbsp; &nbsp;
					<button class='el el-search dlgButton' title="Search and replace characters" onclick="ui.var.dlgRenameReplace(event)"></button>
					&nbsp; &nbsp;
					<button class='el el-refresh dlgButton' onclick="document.getElementById('inpRNNew').value='${fn}'; ui.var.dlgRenameEd=null;" title="Reset new filename"></button>
					<button class='el el-arrow-down dlgButton' onclick="ui.var.dlgRenamePaste(event)" title="Paste text from clipboard"></button>
					<button class='el el-arrow-up dlgButton' onclick="ui.var.dlgRenameCopy(event)" title="Copy text to clipboard"></button>
					<label style="display:block;margin-top:0.5em">
					 	<input id=cbRNHasExt type=checkbox ${ui.var.dlgRenameKeepExt===true ?'checked' :''}  onclick="ui.var.dlgRenameKeepExt = this.checked">
							Select controls should keep file extension
						</label>
						<label style="display:block;">
								<input id=cbRNRecord type=checkbox ${dlgRenameAm.recording===true ?'checked' :''} onclick="dlgRenameAm.recordingToggle()">
								Record selections 
								<button onclick="dlgRenameAm.play(); return ui.eventStop(event);"  style="cursor:pointer; font-size:0.8em">Play</button>
						</label>
						<label style="display:block;">
								<input id=cbRNAutoload type=checkbox ${ui.var.dlgRenameAutoLoad===true ?'checked' :''}>
								Reload folder items after change
						</label>`,
		buttons:{
			default: 'Rename',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
			Rename: function(dlg, btn){	//save and close
				//assume: dlg === dlgRename
				ui.var.dlgRenameBtnRenameClick(dlg, btn)
/*
				var newfn = dlgRename.querySelector('#inpRNNew').value.trim()
				var autoload = dlgRename.querySelector('#cbRNAutoload').checked
				if(newfn==='') {
					dlgFactory.bbl(`Please supply a new filename.`)
					return
				}
				const path = require('path');
				let oldpath = ui.calc.pathForOS(obj.path),
						newpath = path.join(path.dirname(obj.path), '/', newfn)
				if(obj.isDirectory) newpath += '\\'
				if(fs.existsSync(newpath)===true){
					dlgFactory.bbl(`An item named "${newfn}" was found in this folder.`)
					return
				}
				dlgRename.style.display = 'none'

				dlgFactory.create({
					focusId: '#btn0',
					title:'Confirm file rename',
					width:'51em',
					onClose:function(dlgConfirm,force){
//						dlgConfirm.style.display='none'
						if(force===true){
							dlgFactory.close(dlgRename,true)
						}
						else{
							dlgRename.style.display = 'block'
						}
					},
					attrib:{ style:{zIndex:1501, maxWidth:'none'}},
					body: `<label style="display:block;margin-top:0.5em">Rename:<br>&nbsp; &nbsp; <textarea id=inpOld type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${fn}]</textarea></label>
								 <label style="display:block;margin-top:0.5em">To:<br>&nbsp; &nbsp; <textarea id=inpRNChanged type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${newfn}]</textarea></label>
								 <!--label style="display:block;margin-top:0.5em"><input id=cbRNAutoload type=checkbox ${autoload===true ?'checked' :''}> Reload folder items after change</label-->`,
					buttons:{
						default: 'Confirm',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
						Confirm: function(dlgConfirm, btn){	//save and close
							var autoload = dlgRename.querySelector('#cbRNAutoload').checked
							dlgFactory.close(dlgConfirm,true)
							let cmd = `rename "${oldpath}" "${newfn}"`
							console.log('Renaming:', cmd)
							try{
								res = ui.calc.exec(cmd).trim()
							}
							catch(err){
								console.log(`Rename "${obj.basename}" failed:`, err)
								let ss = (err.stderr && err.stderr.length > 1 ? err.stderr :err)
								ss = ss.toString().trim()
								if(ss == 'Access is denied.')
									ss += '  Please verify the file is not in use by another process.'
								alert(`Rename "${obj.basename}" failed:\n\n${ss}.`)
								return
							}
							if(res != ''){
								console.log(`Rename "${obj.basename}" failed:`, res)
								alert(`Rename "${obj.basename}" failed:\n${res}.`)
								return
							}
							ui.var.dlgRenameLast = newfn
							dlgFactory.bbl(`Rename Success`)
							console.log(`Rename Success`)

							if(autoload===true) {
								renderer.folderLoad(ui.args.path)
								let itm = itemPathFind(newpath)
								if(itm != null)
									itemSelect(itm.pid, true)
								else
									console.log('Warning: renamed item not found in list:', newpath)
							}
							else {
								let itm = itemUpdate(oldpath, {
									basename: newfn,
									path: newpath,
									src: 'file:///'+newpath.replace(/\\/g,'/'),
									title: newfn,
									type: (obj.isDirectory ?'folder' :path.extname(newfn))
								})
								itemSelect(itm.pid, true)
							}
						} //confirm button
					}
				})	//confirm dlg create
*/				
			}	//btn rename click
		} //
	})	//rename dlg

	if(gallery===null && obj.mediaType === 'image'){
		galleryShow(obj.pid)
		gallery.dlg.dlgParent = dlgRename
		gallery.listen('initialZoomInEnd', function() {
			let ctrl = document.querySelector('#inpRNNew')
			//console.log('initialZoomInEnd', ctrl.id)
			if(ctrl != null){
				ctrl.focus()
			}
		})
	}

	//populate dlgRenameAm[actions], see actionMap.js
	for(let key in dlgRenameAm.map){
		dlgRenameAm[key] = key
		dlgRenameAm.map[key] = ui.var[key]
	}
	dlgRename.dlg.obj = obj

	return dlgRename
}
function initUiVars(){
	ui.var.dlgRenameEd=null		//reset each call
	ui.var.dlgRenameSelRepeat=null
	ui.var.dlgRenameKeepExt=true

	//if(typeof ui.var.dlgRenameLast==='undefined'){ //only set in this func
		ui.var.dlgRenameLast=''
		ui.var.dlgRenameAutoLoad=false		//true, changed to false because item[pid] is being updated
		ui.var.dlgRenameLoadInc = function(event){	//called by rename dlg
			var nm = ui.var.dlgRenameLast
			if(nm!=='')
				dlgRename.querySelector('#inpRNNew').value=ui.calc.strInc(nm)
			else
				dlgFactory.bbl('No previous filename used.');
		}
		ui.var.dlgRenamePaste = function(event){	//called by rename dlg
			const {clipboard} = require('electron')
			dlgRename.querySelector('#inpRNNew').value=clipboard.readText()
		}
		ui.var.dlgRenameCopy = function(event){	//called by rename dlg
			const {clipboard} = require('electron')
			clipboard.writeText(dlgRename.querySelector('#inpRNNew').value)
		}
		ui.var.dlgRenameDec = function(event){	//called by rename dlg
			const path = require('path');
			fnnew = dlgRename.querySelector('#inpRNNew').value
			var parts = path.parse(fnnew)
			fnnew = ui.calc.strDec(parts.name)+parts.ext
			dlgRename.querySelector('#inpRNNew').value=fnnew
		}
		ui.var.dlgRenameInc = function(event){	//called by rename dlg
			const path = require('path');
			fnnew = dlgRename.querySelector('#inpRNNew').value
			var parts = path.parse(fnnew)
			fnnew = ui.calc.strInc(parts.name)+parts.ext
			dlgRename.querySelector('#inpRNNew').value=fnnew
		}

		ui.var.dlgRenameSelClear = function(event){
			let ed = ui.var.dlgRenameEd
			if(ed === null) return ui.eventStop(event)

			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd

			let val = ''
			if(start > 0)
				val = ed.value.substr(0, start)
			if(end < len)
				val += ed.value.substr(end, len)
			// console.log('selection clear:', val, ed.value)
			ui.var.dlgRenameEd = null
			ed.value = val

			dlgRenameAm.push(dlgRenameAm.dlgRenameSelClear)
			ed.focus()
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveRightWs = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection

			if(init === true){
				dir = 'forward'
				start = 0
				end = 1
			} else
			if(start === end)
				dir = 'forward'		//browser defaults to this

			let results = []
			if(dir === 'forward') {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.indexOf(ch, end)
					if(ii >= 0)
						results.push( ii +1)
				}
			}
			else {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.indexOf(ch, start +1)
					if(ii >= 0)
						results.push( ii )
				}
			}

			if(results.length === 0){
				if(dir === 'forward')
					end = len
				else
					start = 0
			} else
			if(dir === 'forward')
				end = results.sort((a, b) => a - b)[0]
			else
				start = results.sort((a, b) => a - b)[0]

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
			}

			dlgRenameAm.push(dlgRenameAm.dlgRenameSelMoveRightWs)
			ed.focus()
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveRight = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection

			if(init === true){
				dir = 'forward'
				start = 0
				end = 1
			} else
			if(start === end){
				dir = 'forward'
				if(start === len) start = 0
				end = start +1
			} else
			if(dir === 'forward')
				end += 1
			else
				start +=1

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
			}

			dlgRenameAm.push(dlgRenameAm.dlgRenameSelMoveRightWs)
			ed.focus()

			if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveRight')			//mouse held down; called by self
				return
			if(ui.var.dlgRenameSelRepeat === null) {												//initiate mouse hold action
				ui.var.dlgRenameSelRepeat = 'dlgRenameSelMoveRight'
				let nIntervId = window.setInterval(function(){
					if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveRight')
						ui.var.dlgRenameSelMoveRight(event)
					else
						window.clearInterval(nIntervId)
				}, ui.var.dlgRenameSelRepeatDelay)
			}

			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveLeft = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection

			if(init === true){
				dir = 'backward'
				start = len -1
				end = len
				let ii = ed.value.substring( len -4).lastIndexOf('.')
				if(ii >= 0){
					ii = len -4 +ii			//set to char before .
					start = ii -1
					end = ii
				}
			} else
			if(start === end){
				dir = 'backward'
				if(end === 0) end = len
				start = end -1
			} else
			if(dir === 'forward')
				end -= 1
			else
				start -=1

			if(start >= 0 && start <= len	&& end >= 0	&& end <= len){
				dlgRenameAm.push(dlgRenameAm.dlgRenameSelMoveLeft)
				ed.setSelectionRange(start, end, dir)
				ed.focus()
			}

			if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveLeft')			//mouse held down; called by self
				return

			if(ui.var.dlgRenameSelRepeat === null) {												//initiate mouse hold action
				ui.var.dlgRenameSelRepeat = 'dlgRenameSelMoveLeft'
				let nIntervId = window.setInterval(function(){
					if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveLeft')
						ui.var.dlgRenameSelMoveLeft(event)
					else
						window.clearInterval(nIntervId)
				}, ui.var.dlgRenameSelRepeatDelay)
			}
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveLeftWs = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection
			
			if(init === true || (start === end && start === len)){
				dir = 'backward'
				start = len -1
				end = len
				if(ui.var.dlgRenameKeepExt === true){
					const path = require('path');
					let ext = path.extname(ed.value)
					if(ext.length > 0){
						end = len -ext.length			//set to char before .
						start = end -1
					}
				}
			}else
			if(start === end)
				dir = 'backward'

			let results = []
			if(dir === 'forward') {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.lastIndexOf(ch, end -1)
					if(ii >= 0)
						results.push( ii )
				}
			}
			else {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.lastIndexOf(ch, start -1)
					if(ii >= 0)
						results.push( ii )
				}
			}

			if(results.length === 0){
				if(dir === 'forward')
					end = 0
				else
					start = 0
			}else
			if(dir === 'forward')
				end = results.sort((a, b) => a - b)[results.length -1]
			else
				start = results.sort((a, b) => a - b)[results.length -1]

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
//				console.log('  FilenameSelMoveLeftWs:', len, dir, start, end)
//				console.log('    FilenameSelMoveLeftWs:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			}

			dlgRenameAm.push(dlgRenameAm.dlgRenameSelMoveLeftWs)
			ed.focus()
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveLeftAuto = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}

			function local_trimLeft(ss, offset){
				while( ['.', ' '].indexOf(ss[offset -1]) >= 0){
					offset--
					if(offset < 0){
						offset = 0
						break
					}
				}
				return offset
			}

			let fnd = {},
				ss = ed.value,
				end = ss.length,
				keys = {
					E:   { digits:2 },		//find episode: Enn
					S:   { digits:2 },		//find season: Snn
					'20':{ digits:2, pre:['('], post:[')'],  },		//find year: 20nn
					'19':{ digits:2, pre:['('], post:[')'],  },		//find year: 19nn
					'576p':   { digits:0,  },
					'720p':   { digits:0,  },
					'1080p':   { digits:0,  },
				}

			if(ui.var.dlgRenameKeepExt === true){
				const path = require('path');
				let ext = path.extname(ed.value)
				if(ext.length > 0){
					end = ss.length -ext.length			//set to char before .
				}
			}

			for(let key in keys){
				let offset = ss.lastIndexOf(key)
				while(offset >= 0){
					let obj = keys[key]

					if(obj.digits > 0){		//Enn, Snn 20nn, 19nn
						offset += key.length
						let offset2 = offset +obj.digits,
							digits = ss.substring( offset, offset2),
							nn = parseInt(digits, 10)

						// console.log(key, offset, offset2, digits, nn )
						if( Number.isInteger(nn) ){
							fnd[key] = offset2
							break
						}

						offset = offset -key.length -1
						if(offset < 0) break
						offset = ss.lastIndexOf(key, offset -key.length -1)
					}
					else {		//720p, 1080p
						offset = local_trimLeft(ss, offset)
						// if( ss.substring(offset -4, offset) == 'HDTV'){
						// 	offset -= 4
						// 	offset = local_trimLeft(ss, offset)
						// }
						fnd[key] = offset
						break
					}
				}
			}

			let offset = -1
			for(let key in fnd){		//find largest offset
				if(fnd[key] > offset)
					offset = fnd[key]
			}
			
			if(offset < 0)
				offset = end

			let offset2 = ss.indexOf('HDTV')		//final tests
			if( offset2 >= 0 && offset2 < offset)
				offset = local_trimLeft(ss, offset2)
			offset2 = ss.indexOf('x264')
			if( offset2 >= 0 && offset2 < offset)
				offset = local_trimLeft(ss, offset2)
			offset2 = ss.indexOf('XviD')
			if( offset2 >= 0 && offset2 < offset)
				offset = local_trimLeft(ss, offset2)
			offset2 = ss.indexOf('PDTV')
			if( offset2 >= 0 && offset2 < offset)
				offset = local_trimLeft(ss, offset2)

			dlgRenameAm.push(dlgRenameAm.dlgRenameSelMoveLeftAuto)
			ed.setSelectionRange(offset, end, 'backward')
			ed.focus()
			// console.log( 'fnd', offset, fnd )

			return ui.eventStop(event)
		}
		ui.var.dlgRenameReplace = function(event){
			let ed = dlgRename.querySelector('#inpRNNew'),
					val = ed.value,
					dlgReplace = null
			dlgReplace = dlgFactory.create({
					focusId: '#inpRNReplace',
					title:'Replace text in file name',
					width:'51em',
					attrib:{ style:{zIndex:1501, maxWidth:'none'}},
					body: `
						<label style="display:block;margin-top:0.5em">File name:<br>&nbsp; &nbsp; <textarea id=inpOld readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>${val}</textarea></label>
						<label style="display:block;margin-top:0.5em">Find:<br>&nbsp; &nbsp; <input id=inpRNReplace type=text value='.' style='width:54%; text-align:left;'></label>
						<label style="display:block;margin-top:0.5em">Replace with:<br>&nbsp; &nbsp; <input id=inpRNWith type=text value=' ' style='width:54%; text-align:left;'></label>
					`,
					buttons:{
						default: 'Confirm',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
						Confirm: function(dlgConfirm, btn){	//save and close
							let rep = dlgReplace.querySelector('#inpRNReplace').value,
									wi = dlgReplace.querySelector('#inpRNWith').value
							dlgFactory.close(dlgReplace,true)
							if(rep === '' ) {
								console.log('Replace nothing to do', rep, wi)
								return
							}
							let from = val.length -1
							if(rep==='.'){ //preserve file extension
								const path = require('path');
								let ext = path.extname(val)
								if(ext != '')
									from -= ext.length
							}
							let idx = val.lastIndexOf(rep, from)
							while(idx >= 0){
								val = val.replace(rep, wi)
								idx = val.lastIndexOf(rep, from)
							}
//							console.log('replace', rep, wi, from, val, ed.value)
							ed.value = val
						} //confirm button
					}
				})	//dlgReplace create
			return ui.eventStop(event)
		}

		ui.var.dlgRenameBtnRenameClick = function(dlg, btn){
			
			var newfn = dlgRename.querySelector('#inpRNNew').value.trim()
			var autoload = dlgRename.querySelector('#cbRNAutoload').checked
			if(newfn==='') {
				dlgFactory.bbl(`Please supply a new filename.`)
				return
			}
			
			const path = require('path')
			const fs = require('fs')
			let obj = dlgRename.dlg.obj	//dlg.dlg.obj
			var fn = path.basename(obj.path)
			var ext = path.extname(obj.path)
		
			let oldpath = ui.calc.pathForOS(obj.path),
					newpath = path.join(path.dirname(obj.path), '/', newfn)
			if(obj.isDirectory) newpath += '\\'
			if(fs.existsSync(newpath)===true){
				dlgFactory.bbl(`An item named "${newfn}" was found in this folder.`)
				return
			}

			dlgRenameAm.push(dlgRenameAm.dlgRenameBtnRenameClick)
			dlgRename.style.display = 'none'

			dlgFactory.create({
				focusId: '#btn0',
				title:'Confirm file rename',
				width:'51em',
				onClose:function(dlgConfirm,force){
//						dlgConfirm.style.display='none'
					if(force===true){
						dlgFactory.close(dlgRename,true)
					}
					else{
						if(dlgRename != null)
							dlgRename.style.display = 'block'
					}
				},
				attrib:{ style:{zIndex:1501, maxWidth:'none'}},
				body: `<label style="display:block;margin-top:0.5em">Rename:<br>&nbsp; &nbsp; <textarea id=inpOld type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${fn}]</textarea></label>
								<label style="display:block;margin-top:0.5em">To:<br>&nbsp; &nbsp; <textarea id=inpRNChanged type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${newfn}]</textarea></label>
								<!--label style="display:block;margin-top:0.5em"><input id=cbRNAutoload type=checkbox ${autoload===true ?'checked' :''}> Reload folder items after change</label-->`,
				buttons:{
					default: 'Confirm',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
					Confirm: function(dlgConfirm, btn){	//save and close
						var autoload = dlgRename.querySelector('#cbRNAutoload').checked
						dlgFactory.close(dlgConfirm,true)
						let cmd = `rename "${oldpath}" "${newfn}"`
						console.log('Renaming:', cmd)
						try{
							res = ui.calc.exec(cmd).trim()
						}
						catch(err){
							console.log(`Rename "${obj.basename}" failed:`, err)
							let ss = (err.stderr && err.stderr.length > 1 ? err.stderr :err)
							ss = ss.toString().trim()
							if(ss == 'Access is denied.')
								ss += '  Please verify the file is not in use by another process.'
							alert(`Rename "${obj.basename}" failed:\n\n${ss}.`)
							return
						}
						if(res != ''){
							console.log(`Rename "${obj.basename}" failed:`, res)
							alert(`Rename "${obj.basename}" failed:\n${res}.`)
							return
						}
						ui.var.dlgRenameLast = newfn
						dlgFactory.bbl(`Rename Success`)
						console.log(`Rename Success`)

						if(autoload===true) {
							renderer.folderLoad(ui.args.path)
							let itm = itemPathFind(newpath)
							if(itm != null)
								itemSelect(itm.pid, true)
							else
								console.log('Warning: renamed item not found in list:', newpath)
						}
						else {
							let itm = itemUpdate(oldpath, {
								basename: newfn,
								path: newpath,
								src: 'file:///'+newpath.replace(/\\/g,'/'),
								title: newfn,
								type: (obj.isDirectory ?'folder' :path.extname(newfn))
							})
							itemSelect(itm.pid, true)
						}
					} //confirm button
				}
			})	//confirm dlg create
		}
	//}
}