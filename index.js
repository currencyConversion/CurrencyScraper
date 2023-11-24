import puppeteer from "puppeteer";
import * as mongoose from "mongoose";
import {Schema} from "mongoose";
import {Decimal128} from "mongodb";

let acronyms = ['ARS','AUD','BHD','BWP','BRL','GBP','BND','BGN','CAD','CLP','CNY','COP','CZK','DKK','AED','HKD','HUF','ISK','INR','IDR','IRR','ILS','JPY','KZT','KWD','LYD','MYR','MUR','MXN','NPR','NZD','NOK','OMR','PKR','PHP','PLN','QAR','RON','RUB','SAR','SGD','ZAR','KOR','LKR','SEK','CHF','TWD','THB','TTD','TRY','USD','VEF'];

const currencySchema = new Schema({
    currency: String,
    rates: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: mongoose.Types.Decimal128.fromString('0.00')
    }
});

const CurrencyModel = mongoose.model('Currency', currencySchema);
const dbURI = "mongodb+srv://currencyconversion2023:12345@currencyconverterprojec.hhtduxa.mongodb.net/?retryWrites=true&w=majority";
try {

    mongoose.connect(
        dbURI,
        { useNewUrlParser: true, useUnifiedTopology: true }).then(
        () => {console.log(" Mongoose is connected")},
        err=> {console.log(err)}
    );
}
catch (e) {
    console.log("could not connect");
}

const parseRates = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        timeout: 0,
    });

    // Open a new page
    const page = await browser.newPage();

    await page.goto("https://www.x-rates.com/table/?from=EUR&amount=1", {
        waitUntil: "domcontentloaded",
    });

    const getRates = await page.evaluate(() => {
        // Fetch the first element with class "rtRates"
        const rateList = document.querySelectorAll(".rtRates");
        // Convert the rateList to an array
        // For each rtRate get the text
        let exchangeRates = Array.from(rateList).map((rate) => {
            return rate.querySelector("a").innerText;
        })
        return exchangeRates;

    });
    let currencyRates = getRates;
    currencyRates.splice(0, 20);

    for (let i = 1; i < currencyRates.length; i += 2) {
        currencyRates.splice(i, 1); // Remove the element at the even index (i)
        i -= 1;
    }

    console.log(currencyRates);
    // Close the browser
    await browser.newPage();
        try {
            for (let i = 0; i < acronyms.length; i += 1) {
                    const rate = currencyRates[i];
                    let currency = acronyms[i];
                    const decimalRate = new Decimal128(rate);

                    const foundCurrency = await CurrencyModel.findOne({currency});

                    if (foundCurrency) {
                        // Currency already exists, update it
                        await foundCurrency.updateOne({ rates: decimalRate });
                    } else {
                        // Currency doesn't exist, create it
                        const newCurrency = new CurrencyModel({
                            currency,
                            decimalRate,
                        });

                        await newCurrency.save(); // Save the newly created currency
                    }
                }

            console.log('Currencies updated/added successfully');
        } catch (err) {
            console.error('Error updating/adding currencies:', err);
            res.status(500).json({ error: 'Failed to update/add currencies' });
        }


};

const intervalInMilliseconds = 60 * 1000; // 5 minutes in milliseconds
setInterval(parseRates, intervalInMilliseconds);
