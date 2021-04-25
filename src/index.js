const inquirer = require('inquirer')
const puppeteer = require('puppeteer')
const cliSpinner = require('cli-spinner')
let choices
const spinner = new cliSpinner.Spinner().setSpinnerString(2)
const selectors = {
    username: "#username",
    password: "#password",
    login: "#btnLogin",
    print: "#toolPrint",
    pagesRadio: "#optionsRadios2",
    startPage: "#startPage",
    endPage: "#endPage",
    download: "#printContinue",
    openPDF:"#printOpenPDF"
}
inquirer.prompt([
    {
        name: "url",
        message: "book url",
        type: "input"
    },
    {
        name: "page",
        message: "starting page",
        type: "number"
    },
    {
        name: "username",
        message: "shibboleth username",
        type: "input"
    },
    {
        name: "password",
        message: "shibboleth password",
        type: "password"
    },
    {
        name: "saveCreds",
        message: "save credentials in plain text?",
        type: "list",
        choices: ['yes', 'no']
    }

])
    .then(answer => {
        choices = answer
        spinner.start()

    }).then(() => {
    (async () => {
            const browser = await puppeteer.launch({headless: false})
            const page = await browser.newPage()
            await page.goto(choices.url)
            await page.click(selectors.username)
            await page.keyboard.type(choices.username)
            await page.click(selectors.password)
            await page.keyboard.type(choices.password)
            await page.click(selectors.login)
            await page.waitForNavigation({waitUntil: 'networkidle0'})
            await page.click(selectors.print)
            await page.waitForSelector(selectors.pagesRadio)
            await page.click(selectors.pagesRadio)
            await page.click(selectors.startPage)
            await page.keyboard.type(choices.page.toString())
            await page.click(selectors.endPage)
            await page.keyboard.type((choices.page + 36).toString())
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow', downloadPath: './downloads/'
            })
            await page.click(selectors.download)
            await page.waitForSelector(selectors.openPDF)
            await page.click(selectors.openPDF)
            await page.waitFor(10000)
            // await page.goto(choices.url, {waitUntil: "networkidle2"})

            await page.screenshot({path: 'test.png'})
            await browser.close()
        }
    )()
}).then(()=>{
    spinner.stop()
})