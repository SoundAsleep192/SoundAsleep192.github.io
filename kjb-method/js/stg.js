// Глобальные переменные 
var signalEnergy = 0.15; // чем выше значение, тем устойчивее к искажениям (+ заметнее)
var sigmaMin = -3;
var sigmaMax = 3;
var Repeat = 20; // количество встраиваний
// *******************//


$('button.write, button.read').click(function(event) {
    event.preventDefault();
});


// Предпросмотр исходного изображения
function previewDecodeImage() {
    var file = document.querySelector('input[name=decodeFile]').files[0];
    
    previewImage(file, ".read canvas", function() {
        $(".read").fadeIn();
    });
}


// Предпросмотр изображения-ключа
function previewDecodeKeyImage() {
    var file = document.querySelector('input[name=stgKeyImage]').files[0];
    
    previewImage(file, ".decodekey canvas", function() {
        $(".decodekey").fadeIn();
    });
}


// Предпросмотр изображения со стегоконтейнером
function previewEncodeImage() {
    var file = document.querySelector("input[name=baseFile]").files[0];
    $(".images .message").hide();
    $(".images .stgkeyImage").hide();

    previewImage(file, ".sourceImage canvas", function() {
        $(".images .sourceImage").fadeIn();
        $(".images").fadeIn();
    });
}


// Предпросмотр фото
function previewImage(file, canvasSelector, callback) {
    var reader = new FileReader();
    var image = new Image;
    var $canvas = $(canvasSelector);
    var context = $canvas[0].getContext('2d');

    if(file){
        reader.readAsDataURL(file);
    }

    reader.onloadend = function () {
        image.src = URL.createObjectURL(file);

        image.onload = function() {
            $canvas.prop({
                'width': image.width,
                'height': image.height
            });

        context.drawImage(image, 0, 0);
        callback();
        }
    }
    
}


// Функция встраивания сообщения в изображение
function writeMessage() {
    
    let text = $("textarea.message").val();

    // Исходное изображение
    let $srcCanvas = $('.sourceImage canvas');
    let srcContext = $srcCanvas[0].getContext("2d");
    
    // Модифицированное изображение
    let $modCanvas = $('.modImage canvas');
    let modContext = $modCanvas[0].getContext("2d");

    let width = $srcCanvas[0].width;
    let height = $srcCanvas[0].height;

    $modCanvas.prop({
        'width': width,
        'height': height
    });

    // Изображение-стегоключ
    let $stgkeyCanvas = $('.stgkeyImage canvas');
    let stgkeyContext = $stgkeyCanvas[0].getContext("2d");

    var binaryMessage = getBinaryMessage(text);
    
    var srcImg = srcContext.getImageData(0, 0, width, height);
    var srcPx = srcImg.data;
    
    // Переменные ================================================== //
    let modBlue; 
    let brg = [];
    // ============================================================ //
    
    let repeatBinaryMessage = getRepeatedMsg(binaryMessage, Repeat);
    let pxs = getPxsForBits(srcPx, width, height, sigmaMin, sigmaMax, signalEnergy, repeatBinaryMessage);

    for(let i = 0; i < pxs.length; i++){
        brg[i] = getPxsBrightness(srcPx, pxs[i], signalEnergy)
        modBlue = modifyBlueChannel(repeatBinaryMessage[i], srcPx[4 * pxs[i] + 2], signalEnergy, brg[i]);
        srcPx[4*pxs[i] + 2] = modBlue;
    }

    
//  Генерация изображения-ключа для последующего извлечения данных
    
    let maxPxNum = pxs[pxs.length - 1];
    let squareSide = Math.round(Math.sqrt(maxPxNum));
    
    $stgkeyCanvas.prop({
        'width': squareSide,
        'height': squareSide
    });
    
    let stgKey = stgkeyContext.createImageData(squareSide, squareSide);
    let stgKeyImage = stgKey.data;
    let cntr = 0;
    
    let key1 = document.getElementById('key1').value;
    let key2 = document.getElementById('key2').value;
    let key3 = document.getElementById('key3').value;
    
    
    if(validate(key1) == 0 && validate(key2) == 0 && validate(key3) == 0 ){
        
        
        for(let j = 0; j < (srcPx.length)/4; j++){
        
        if(j == pxs[cntr]){
            
            stgKeyImage[4 * j] = key1;
            stgKeyImage[4 * j + 1] = key2;
            stgKeyImage[4 * j + 2] = key3;
            stgKeyImage[4 * j + 3] = 255;
            cntr++;
            
        } else {
            
            stgKeyImage[4 * j] = getRandomInt( 0, 255, key1);
            stgKeyImage[4 * j + 1] = getRandomInt( 0, 255, key2);
            stgKeyImage[4 * j + 2] = getRandomInt( 0, 255, key3);
            stgKeyImage[4 * j + 3] = 255;
        }
        
        }
        
        //  Заполнение холстов
        stgkeyContext.putImageData(stgKey, 0, 0);
        $(".images .stgkeyImage").fadeIn();
        
        modContext.putImageData(srcImg, 0, 0);
        $(".images .modImage").fadeIn();
        
    } else {
        alert("Ошибка при вводе значений каналов пикселя. Введите значение в диапазоне [0; 255]")
    }
    
};


function readMessage() {
    
    let $srcCanvas = $('.read canvas');
    let srcContext = $srcCanvas[0].getContext("2d");
    
    let width = $srcCanvas[0].width;
    let height = $srcCanvas[0].height;
    
    let srcImgData = srcContext.getImageData(0, 0, width, height);
    let srcPx = srcImgData.data;
    
    
// get key pixels
    let $stgKeyCanvas = $('.decodekey canvas');
    let stgKeyContext = $stgKeyCanvas[0].getContext("2d");
    
    let keywidth = $stgKeyCanvas[0].width;
    let keyheight = $stgKeyCanvas[0].height;
    
    let srcImgKeyData = stgKeyContext.getImageData(0, 0, keywidth, keyheight)
    let keyPx = srcImgKeyData.data;
    
    let key1 = document.getElementById('key1ex').value;
    let key2 = document.getElementById('key2ex').value;
    let key3 = document.getElementById('key3ex').value;
    
    let pxWithData = [];
    let counter = 0;
    
    if(validate(key1) == 0 && validate(key2) == 0 && validate(key3) == 0 ){
        for(let i = 0; i < (keyPx.length)/4; i++){
            if( (keyPx[4*i] == key1) && (keyPx[4*i + 1] == key2) && (keyPx[4*i + 2] == key3) ){
                pxWithData[counter] = i;
                counter++;
            }
        }
// end getting key pixels

    let binMessage = restoreBinaryMessage(srcPx, pxWithData, width, height, sigmaMin, sigmaMax, Repeat);
    let output = getTextFromBinary(binMessage);

    $('.binary-decode textarea').text(output);
    $('.binary-decode').fadeIn();
    } else {
        alert("Ошибка при вводе значений каналов пикселя. Введите значение в диапазоне [0; 255]");
    }
};



// *************************************
// Блок функций для внедрения сообщения
// *************************************


// Функция для представления исходного сообщения в бинарном виде
function getBinaryMessage(srcText){
var binaryMessage = "";
    for(var i = 0; i < srcText.length; i++) {
        var binaryChar = srcText[i].charCodeAt(0).toString(2);

        while(binaryChar.length < 8) {
            binaryChar = "0" + binaryChar;
        }
        binaryMessage += binaryChar;
    }
    return binaryMessage;
}


// Функция для отбора допустимых для встраивания пикселей
function getPxsForBits(Pixel, Width, Height, SigmaMinValue, SigmaMaxValue, SignalEnergy, Text){
    
    let amountOfPx = (Pixel.length / 4);

    if(Text.length <= amountOfPx){

        // Массив значений синих каналов пикселей
        let bc = getBlueChannels(Pixel);
        // Массив прогнозируемых значений синего канала
        let fbc = getForecastBlueChannels(bc, Width, Height, SigmaMinValue, SigmaMaxValue);

        // Массив значений синих каналов пикселей
        let br = getArrPxsBr(Pixel, SignalEnergy);
        // Массив прогнозируемых значений синего канала
        let fbr = getForecastBlueChannels(br, Width, Height, SigmaMinValue, SigmaMaxValue);
        
        
        // pxNumPool - массив, хранящий допустимые значения пикселей для записи
        let pxNumPool = [];
        
        let counter = 0;

        let blueDelta;
        let bit;
    
        for(let i = 0; i < amountOfPx; i += getRandomInt( 1,6,6) ){
            
            // Ищем однотонные пиксели
            if( (bc[i] > 0) && (Math.abs(fbr[i] - br[i]) < 3) ){
                
                if(counter < Text.length){
                        
                    blueDelta = bc[i] - fbc[i];

                    if((fbc[i] == 255) && (blueDelta == 0)){
                        blueDelta = 0.5;
                    } else if((fbc[i] == 0) && (blueDelta == 0)){
                        blueDelta = -0.5;
                    }

                    if( blueDelta < 0 ){
                        bit = 0;
                    } else if(blueDelta > 0){
                        bit = 1;
                    }

                    if(bit == Text[counter]){
                        pxNumPool[counter] = i;
                        counter++;
                    }

                } // end if
                
            }
        }

        return pxNumPool;
        
    } else { 
        alert("Сообщение превышает максимальное значение для выбранного изображения!"); 
    }

}


// Функция для определения яркости определённого пикселя
function getPxsBrightness(Pixel, PxNum, SignalEnergy){

    Y = 0.299 * Pixel[PxNum] + 0.587 * Pixel[PxNum + 1] + 0.114 * Pixel[PxNum + 2];
    if( Y == 0 ) { Y  = 5 / SignalEnergy; }

    return Y;
}


// Функция, возвращающая массив значений яркости пикселей
function getArrPxsBr(Pixel, SignalEnergy){

    let Y = [];
    let k = 0;
    for(let Counter = 0; Counter < Pixel.length/4; Counter++){
        Y[k] = 0.299 * Pixel[4*Counter] + 0.587 * Pixel[4*Counter + 1] + 0.114 * Pixel[4*Counter + 2];
        if( Y[k] == 0 ) { Y[k]  = 5 / SignalEnergy; }
        k++;
    }
        
    return Y;
    
}


// Функция, возвращающая изменённое значение синего канала
function modifyBlueChannel(msgBit, srcBlueChannel, signalEnergy, PxBrightness){
    let modBlueChannel = Math.round( srcBlueChannel + (2 * msgBit - 1) * signalEnergy * PxBrightness );
        if( modBlueChannel < 0 ) { modBlueChannel = 0; }
        if( modBlueChannel > 255 ) { modBlueChannel = 255; }
    return modBlueChannel;
}


// Функция, возвращающая случайное число из заданного диапазона
function getRandomInt(min, max, exp) {
    let n;
    while(true){
        if((n = Math.floor(Math.random() * (max - min + 1)) + min) != exp)
        return n;
    }
}


function getRepeatedMsg(Text, Repeat){
    let repeatBinaryMessage = "";
    let buf = 0;
    for(let t = 0; t < Text.length; t++){
        while( buf < Repeat ){
            repeatBinaryMessage += Text[t];
            buf++;
        }
        buf = 0;
    }
    return repeatBinaryMessage;
}


function validate(Value){
    if (isNaN(Value) || Value < 0 || Value > 255 || Value == '') {
        return 1;
    } else {
        return 0;
    }
}

// *************************************
// Блок функций для извлечения сообщения
// *************************************


// Функция возврата массива значений синего канала всех пикселей
function getBlueChannels(Pixel){
    let arr = [];
    let counter = 0;
        for(var x = 0; x < Pixel.length; x += 4){
            arr[counter] = Pixel[x + 2];
            counter++;
        }
    return arr;
}


// Функция возврата массива с прогнозируемыми значениями синего канала
function getForecastBlueChannels(BlueChannel, Width, Height, sigmaMinValue, sigmaMaxValue){
    
    // Сумма соседних пикселей по горизонтали
    let rowSum = [];
        rowSum = getRowSum(BlueChannel, Width, Height, sigmaMinValue, sigmaMaxValue );
    // Сумма соседних пикселей по вертикали
    let columnSum = [];
        columnSum = getColumnSum(BlueChannel, Width, sigmaMinValue, sigmaMaxValue);
    
    let frcBlue = [];
    for(var i = 0; i < BlueChannel.length; i++){
        frcBlue[i] = (1 / (4 * sigmaMaxValue)) * ( rowSum[i] + columnSum[i] - 2 * BlueChannel[i] );
    }
    return frcBlue;
}


// Восстановление бинарной последовательности
function restoreBinaryMessage(Pixel, PixelsWithData, Width, Height, sigmaMinValue, sigmaMaxValue, Repeat){
    
    // Массив синих каналов пикселей
    let blueChannel = getBlueChannels(Pixel);
    // Массив прогнозируемых значений синего канала
    var frcBlue = getForecastBlueChannels(blueChannel, Width, Height, sigmaMinValue, sigmaMaxValue);
    // Массив из разности синего канала изображения с прогнозируемым значением
    let blueDelta;
    
    let binMessage = ""; // Исходное сообщение в бинарном представлении
    let binValue; // Очередной бит сообщения

    let counter = 0;
    let sumDelta = 0;
    let cntr = 0;
    let avgDelta = 0;
    
    for(let i = 0; i < PixelsWithData.length; i++){
        
        blueDelta = Pixel[ 4 * PixelsWithData[i] + 2 ] - frcBlue[ PixelsWithData[i] ];
        
        if( (frcBlue[ PixelsWithData[i] ] == 255) && (blueDelta == 0) ){
            blueDelta = 0.5;
        } else if( (frcBlue[ PixelsWithData[i] ] == 0) && (blueDelta == 0) ){
            blueDelta = -0.5;
        }
        
        sumDelta = sumDelta + blueDelta;
        cntr++;
        
        if(cntr == Repeat){
            
            avgDelta = (1/Repeat) * sumDelta;
            
            if( avgDelta < 0 ){
                binValue = 0;
                binMessage += binValue;
            } else if(avgDelta > 0){
                binValue = 1;
                binMessage += binValue;
            }
        cntr = 0;
        sumDelta = 0;
        }

        counter++;
    }

    return binMessage;
}


// Функция для суммы ряда по горизонтали по заданному диапазону
function getRowSum(PxArray, Width, Height, MinSigmaValue, MaxSigmaValue){
let sum = 0;
let sumValues = [];
    
    for(var numRow = 0; numRow < Height; numRow++){
        for(var i = numRow * Width; i < Width + (numRow * Width); i++){

            for(var sigma = MinSigmaValue; sigma <= MaxSigmaValue; sigma++){

                if(PxArray[i + sigma] !== undefined){ // игнорируем отрицательные знаения

                    if( ((i + sigma) >= Width + ((numRow - 1) * Width )) && ((i + sigma) < Width + (numRow * Width))  ){ 
                        sum += PxArray[i + sigma];
                    }   

                }
            }
            sumValues[i] = sum;
            sum = 0;
        }
    }

    return sumValues;
}


// Функция для суммы ряда по вертикали по заданному диапазону
function getColumnSum(PxArray, Width, MinSigmaValue, MaxSigmaValue){
let sum = 0;
let sumValues = [];
    
    for(var Counter = 0; Counter < PxArray.length; Counter++){
        for(var sigma = MinSigmaValue; sigma <= MaxSigmaValue; sigma++){
            if(PxArray[Counter + (sigma * Width)] !== undefined){
                if( (Counter + (sigma * Width)) >= 0) {
                    sum += PxArray[Counter + (sigma * Width)]
                }
            }
        }
        
        sumValues[Counter] = sum;
        sum = 0;
    }
    return sumValues;
}


// Перевод бинарной последовательности в ASCII
function getTextFromBinary(binaryMessage){
    let srcMessage = "";
    let add = 0;
    
    for (let i = 0; i < binaryMessage.length; i += (8 + add)) {
        let c = 0;
        
            for (let j = 0; j < (8 + add); j++) {
                
                c <<= 1; // сдвиг на 1 бит влево, добавление справа нулей
                c |= parseInt(binaryMessage[i + j]); // операция ИЛИ
                
                if( (j == 0) && (parseInt(binaryMessage[i + j]) == 1) ){
                    add = 3;
                } else if( (j == 0) && (parseInt(binaryMessage[i + j]) == 0) ){
                    add = 0;
                }
                console.log(i + " | " + j + " = " + c);
            }

        srcMessage += String.fromCharCode(c);

    }
    return srcMessage;
}