async function updateSite(filename, content){
    const resp = await fetch(`${window.origin}/${filename}`, {method: 'put', body: content})
    const newLocation = resp.headers.get('location')
    window.location = new URL(newLocation).origin
}

async function publishSite(){
    let resp = await fetch('ipns://localhost/?key=mysite', {method: 'POST'})
    const key = resp.headers.get('location')
    resp = await fetch(key, {method: 'POST', body: window.origin})
    window.location = new URL(resp.headers.get('location')).origin
}

async function loadFile(filename){
    const resp = await fetch(filename)
    const content = await resp.text()
    document.getElementById('idFilenameInput').value = filename
    document.getElementById('idContentInput').value = content
}

async function listDir(path){
    const resp = await fetch(path + '?noResolve')
    const files = await resp.json()
    return files
}

async function loadSidebar(){
    const sidebar = document.getElementById('idSidebar')
    const files = await listDir(window.origin)
    const list = document.createElement('ul')
    list.style =  "list-style: none; padding-inline-start: 0;"

    async function makeFileListElements(path, file) {
        if (file.endsWith('/')){
            let subfiles = await listDir(window.origin + path + file)
            let elements = await Promise.all(
                subfiles.map(subfile => 
                    makeFileListElements(path + file, subfile)
                )
            )
            return elements.reduce( (arr, el) => [...arr, ...el] )
        }
        let li = document.createElement('li')
        li.innerHTML = `<a href="#">${path}${file}</a>`
        li.querySelector('a').onclick = e => loadFile(path + file)
        return [li]
    }

    await Promise.all(
        files.map(async file => {
            let elements = await makeFileListElements('/', file)
            elements.map(li => list.appendChild(li))
        })
    )

    sidebar.appendChild(list)
    
    if (window.origin.startsWith('ipfs://')){
        const button = document.createElement('button')
        button.innerHTML = 'Publish site'
        button.onclick = e => {
            e.preventDefault()
            publishSite()
        }
        sidebar.appendChild(button)
    }
    let dirUploadForm = document.createElement('directory-upload')
    dirUploadForm.addEventListener('dirUpload', e => {
        console.log('onDirUpload', e)
        window.location = e.detail.cid
    })
    sidebar.appendChild(dirUploadForm)
}

async function showEditor(){
    let editorDiv = document.getElementById("editor")
    if (!editorDiv){
        editorDiv = document.createElement('div')
        editorDiv.id = 'editor'
    }
    editorDiv.style = `display: flex;
        flex-direction: column;
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgb(233 233 233 / 95%);
    `
    editorDiv.innerHTML = `<div style="display: flex; flex-grow: 1; padding: 1em">
        <div id="idSidebar" style="padding-right: 1em; width: 20vw; overflow: scroll"><h2>Files</h2>
        </div>
        <form id="idForm" style="flex-grow: 1; display: flex; flex-direction: column;" spellcheck="false">
            <label for="idFilenameInput">Filename</label>
            <input type="text" name="filename" id="idFilenameInput"></input>
            <label for="idContentInput">Content</label>
            <textarea id="idContentInput" style="flex-grow: 1;" rows="20"></textarea>
            <input type="submit" value="Save"></input>
        </form>
    </div>`
    document.body.appendChild(editorDiv)
    const form = document.getElementById('idForm')
    form.onsubmit = e => {
        e.preventDefault()
        const filename = document.getElementById('idFilenameInput').value
        const content = document.getElementById('idContentInput').value
        updateSite(filename, content)
    }

    await loadSidebar()

}

