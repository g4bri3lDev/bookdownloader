const inquirer = require('inquirer')
const puppeteer = require('puppeteer')
const cliSpinner = require('cli-spinner')
const nconf = require('nconf')
const args = require('minimist')(process.argv.slice(2));

nconf
    .file({file: './config.json'})

let choices = args
choices = Object.assign({}, nconf.get('choices'), choices)
nconf.set('choices', choices)
const spinner = new cliSpinner.Spinner().setSpinnerString(2)
// console.log(nconf.get('choices'))
const selectors = {
    username: "#username",
    password: "#password",
    login: "#btnLogin",
    print: "#toolPrint",
    pagesRadio: "#optionsRadios2",
    startPage: "#startPage",
    endPage: "#endPage",
    download: "#printContinue",
    openPDF: "#printOpenPDF"
}
inquirer.prompt([
    {
        name: "url",
        message: "book url",
        type: "input",
        when: nconf.get('choices').url === undefined
    },
    {
        name: "page",
        message: "starting page",
        type: "number",
        when: nconf.get('choices').page === undefined
    },
    {
        name: "username",
        message: "shibboleth username",
        type: "input",
        when: nconf.get('choices').username === undefined
    },
    {
        name: "password",
        message: "shibboleth password",
        type: "password",
        when: nconf.get('choices').password === undefined
    },
    {
        name: "saveCreds",
        message: "save credentials in plain text?",
        type: "list",
        choices: ['yes', 'no'],
        when: nconf.get('choices').saveCreds === undefined
    }

])
    .then(answer => {
        answer = Object.assign({}, choices, answer)

        nconf.set('choices', answer)
        if (nconf.get('choices').saveCreds === 'yes') {
            nconf.save(function () {
                require('fs').readFile('./config.json', function (err, data) {
                    JSON.parse(data.toString())
                })
            })
        }
        spinner.start()
    }).then(() => {
    (async () => {
            const browser = await puppeteer.launch({headless: false})
            const page = await browser.newPage()
            await page.goto(nconf.get('choices').url)
            await page.click(selectors.username)
            await page.keyboard.type(nconf.get('choices').username)
            await page.click(selectors.password)
            await page.keyboard.type(nconf.get('choices').password)
            await page.click(selectors.login)
            if (page.url() === "https://login.tum.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2") {
                await browser.close()
                console.error("Username or password were incorrect.")
                process.exit()
            }
            await page.waitForNavigation({waitUntil: 'networkidle0'})
            if (await page.evaluate('document.querySelector("' + selectors.print + '").getAttribute("disabled")') === 'disabled') {
                await browser.close()
                console.error("print contingent already reached")
                process.exit()
            }
            await page.waitForSelector(selectors.print)
            await page.click(selectors.print)
            await page.waitForSelector(selectors.pagesRadio)
            await page.click(selectors.pagesRadio)
            await page.click(selectors.startPage)
            await page.keyboard.type(nconf.get('choices').page.toString())
            await page.click(selectors.endPage)
            await page.keyboard.type((nconf.get('choices').page + 36).toString())
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow', downloadPath: './downloads/'
            })
            await page.click(selectors.download)
            await page.waitForSelector(selectors.openPDF)
            await page.click(selectors.openPDF)
            await page.waitFor(10000)
            // await page.goto(choices.url, {waitUntil: "networkidle2"})

            // await page.screenshot({path: 'test.png'})
            await browser.close().then(() => {
                const originalConfig = {...nconf.get('choices')}
                if (nconf.get('choices').saveCreds === 'no') {
                    delete originalConfig.username
                    delete originalConfig.password
                    // console.log(originalConfig)
                }
                originalConfig.page += 37
                nconf.set('choices', originalConfig)
                nconf.save(function () {
                    require('fs').readFile('./config.json', function (err, data) {
                        JSON.parse(data.toString())
                    })
                })
            })
        }
    )()
}).then(() => {

    spinner.stop()
})