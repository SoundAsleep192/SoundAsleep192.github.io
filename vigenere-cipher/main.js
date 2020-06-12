class VigenereCipher {
    constructor() {
        this._symbolCodeRange = [[9, 10], [32, 47], [48, 57], [58, 64], [65, 90], [97, 122], [1040, 1071], [1072, 1103]]; // поддерживаемые символы
        this._defaultAlphabet = []; // массив для заполнения символами алфавита
        this._tabulaRecta = []; // двумерный массив для хранения таблицы Виженера
        for (let j = 0; j < this._symbolCodeRange.length; j++) {
            for (let i = this._symbolCodeRange[j][0]; i <= this._symbolCodeRange[j][1]; i++) { // заполняем массив символами
                this._defaultAlphabet.push(String.fromCharCode(i));
            }
        }
        this._tabulaRecta.push(this._defaultAlphabet);
        for (let i = 1; i < this._defaultAlphabet.length; i++) {
            const nextAlphabet = this._spinAlphabet([...this._tabulaRecta[i - 1]]); // заполняем таблицу Виженера
            this._tabulaRecta.push(nextAlphabet);
        }
    }
    static getInstance() {
        if (!VigenereCipher.instance) {
            VigenereCipher.instance = new VigenereCipher(); // метод, реализующий паттерн Singleton
        }
        return VigenereCipher.instance;
    }
    encode(text, key) {
        const textArray = text.split(''); // разбивает их на массивы символов
        const keyArray = this._getKeyStream(key, text).split(''); // (так приходится делать, это javascript),
        const result = []; // обявляем переменную для результата,
        for (let i = 0; i < text.length; i++) { // и затем для каждого символа в этих массивах
            const charIndex = this._defaultAlphabet.indexOf(textArray[i]); // вычисляет строчку и
            const keyIndex = this._defaultAlphabet.indexOf(keyArray[i]); // стоблец, на пересечении которых
            const cipheredChar = this._tabulaRecta[charIndex][keyIndex]; // находится искомый "зашифрованный" символ
            result.push(cipheredChar); // Добавляет его к массиву-результату
        } //
        return result.join(''); // и возвращает строку, слепленную из массива-результата
    }
    decode(cipheredText, key) {
        const cipheredTextArray = cipheredText.split(''); // разбивает их на массивы символов
        const keyArray = this._getKeyStream(key, cipheredText).split(''); // (так приходится делать, это javascript),
        const result = []; // обявляем переменную для результата,
        for (let i = 0; i < cipheredText.length; i++) { // и затем для каждого символа в зашифрованной строке
            const keyIndex = this._defaultAlphabet.indexOf(keyArray[i]); // находит строку по соответствующему символу ключа
            const cipheredTextColumnIndex = this._tabulaRecta[keyIndex] // и в этой строке соответствующий символ зашифрованного текста,
                .indexOf(cipheredTextArray[i]); // а затем по стоблику, в котором находится этот символ,
            const decodedChar = this._defaultAlphabet[cipheredTextColumnIndex]; // находим символ исходного "расшифрованного" текста
            result.push(decodedChar); // и добавляем его к результату
        } //
        return result.join(''); // и возвращаем результат в виде строки
    }
    _spinAlphabet(alphabet) {
        const firstCharacter = alphabet.shift(); // берет первый символ из массива,
        alphabet.push(firstCharacter); // добавляет его в конец
        return alphabet; // и возвращает новый массив
    }
    _getKeyStream(key, text) {
        let result = key; // берет ключ и исходный текст,
        while (result.length < text.length) { // и генерирует новую строку, в которой
            result += key; // повторяет ключ до тех пор, пока эта строка
        } // не станет длинее чем исходный текст,
        return result.slice(0, text.length); // после чего возвращает ее, обрезав до длины исходного текста
    }
}
// ----------- код ниже этой строки отвечает за взаимодействие с элементами интерфейса на странице, подробно описывать не буду -----------
const encoder = VigenereCipher.getInstance();
const errorBox = document.getElementById('error');
const text1 = document.getElementById('text');
const key1 = document.getElementById('key');
const buttonEncode = document.getElementById('encode_button');
const result1 = document.getElementById('result');
buttonEncode.addEventListener('click', () => {
    try {
        if (!text1.value)
            throw new Error('не введен текс для шифрования');
        if (!key1.value)
            throw new Error('не введен ключ шифрования');
        errorBox.textContent = '';
        result1.textContent = encoder.encode(text1.value, key1.value);
    }
    catch (err) {
        console.error(err.message);
        errorBox.textContent = `Ошибка: ${err.message}!`;
    }
});
const text2 = document.getElementById('text2');
const key2 = document.getElementById('key2');
const buttonDecode = document.getElementById('decode_button');
const result2 = document.getElementById('result2');
buttonDecode.addEventListener('click', () => {
    try {
        if (!text2.value)
            throw new Error('не введен текс для расшифровки');
        if (!key2.value)
            throw new Error('не введен ключ для расшифровки');
        errorBox.textContent = '';
        result2.textContent = encoder.decode(text2.value, key2.value);
    }
    catch (err) {
        console.error(err.message);
        errorBox.textContent = `Ошибка: ${err.message}!`;
    }
});
