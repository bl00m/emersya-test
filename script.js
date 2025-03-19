async function loadConfig() {
	return await fetch('config.json')
		.then(resp => resp.json())
		.then(data => data)
		.catch(_ => null)
}

function createMenu(config) {
	const form = document.getElementById('menu')

	for (let groupConf of config.groupConfigurations) {
		console.log({groupConf})
		const field = document.createElement('div')
		field.classList.add('field')

		const label = document.createElement('label')
		label.appendChild(document.createTextNode(groupConf.label))
		label.classList.add('label')
		field.appendChild(label)

		const control = document.createElement('div')
		control.classList.add('control')
		field.appendChild(control)

		const selectDiv = document.createElement('div')
		selectDiv.classList.add('select')
		control.appendChild(selectDiv)

		const select = document.createElement('select')
		select.setAttribute('name', groupConf.groupName)
		selectDiv.appendChild(select)

		for (let conf of groupConf.configurations) {
			const option = document.createElement('option')
			option.setAttribute('value', conf.configurationName)
			option.appendChild(document.createTextNode(conf.label))
			select.appendChild(option)
		}

		form.appendChild(field)
	}

	return form
}

function updateMenu(config, form, groupsConfiguration) {
	for (let group of groupsConfiguration) {
		const groupConf = config.groupConfigurations.find(g => g.groupName === group.groupName)

		if (groupConf) {
			const conf = groupConf.configurations.find(c => c.configurationName === group.configurationName)

			if (!conf) {
				console.log("current configurationName is missing from config", group)
				continue
			}

			const select = form.querySelector(`select[name="${group.groupName}"]`)
			select.value = group.configurationName
		}
	}
}

async function main() {
	const config = await loadConfig()

	if (!config) {
		alert("Failed to load configuration file")
		return
	}

	let viewerIframe = null
	let viewerActive = false

	const form = createMenu(config)

	form.addEventListener('change', event => {
		if (!viewerActive) return

		const groupName = event.target.name
		const configName = event.target.value

		viewerIframe.postMessage({
			action: 'setMaterialsGroup',
			groupName: groupName,
			configurationName: configName
		}, '*')
	})

	function viewerEventListener(event) {
		if (event.data && event.data.action == 'onStateChange') {
			if (event.data.state.viewerState == 'loaded' || event.data.state.viewerState == 'fallbackloaded') {
				viewerActive = true

				viewerIframe.postMessage({
					action: 'getCurrentMaterialsGroup'
				},'*')
			}
		}

		if (event.data && event.data.action == 'onCurrentMaterialsGroupGet') {
			// Ensure that the form reflects current material
			updateMenu(config, form, event.data.groupsConfiguration)
		}

		if (event.data && event.data.action == 'onError') {
			console.log(event.data)

			if (event.data && event.data.callAction == 'setMaterialsGroup') {
				// Failed to set material group. Reset the form
				viewerIframe.postMessage({
					action: 'getCurrentMaterialsGroup'
				},'*')
			}
		}
	}

	const iframe = document.getElementById('emersya-iframe')
	iframe.addEventListener('load', () => {
		viewerIframe = iframe.contentWindow

		window.removeEventListener('message', viewerEventListener ,false)
		viewerIframe.postMessage({
			action: 'registerCallback'
		}, '*')

		window.addEventListener('message', viewerEventListener, false)
		viewerIframe.postMessage({
			action:'getViewerState'
		}, '*')
	})
}

main()
