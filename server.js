const fs = require("fs");
const beautify = require('js-beautify').js;
const excelToJson = require('convert-excel-to-json');
const xlsxFile = require('xlsx');

const express = require('express');
const app = express();
const multer = require('multer');
const cors = require('cors');

app.use(cors())

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'upload')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname )
    }
})

const upload = multer({ storage: storage}).array('file')

app.post('/upload', function(req, res) {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json(err)
        } else if (err) {
            return res.status(500).json(err)
        }
        req.files.forEach(file => {
          if (file.filename.split('.').pop() === 'xlsx') {
            modifyBoatClickFiles('upload/' + file.filename);
          }
        });
        // modifyBoatClickFiles('upload/' + req.files[0].filename);
        return res.status(200);
    })
});

let objectD;
let enFileContent;
let enFileAsArray;
let scriptFileContent;  

function modifyBoatClickFiles(filePath) {
  enFileContent = fs.readFileSync('upload/en.txt');
  enFileAsArray = enFileContent.toString().split(/\n/);
  scriptFileContent = getScriptFileContent('upload/script_mobile.js');  
  let excelData = getDataFromExcelFile(filePath);  
  parseSuccesfull = false;
  const lettersArray = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < lettersArray.length; i++) {
    try {
      objectD = parseFileContentToObject(scriptFileContent, lettersArray[i]);
      break;
    } catch {
    }
  }
  
  let cardsData = excelData[Object.keys(excelData)[0]];
  cardsData.forEach(card => {
    let children = getCardChildren('/' + card.cardName);
    // console.log(card.cardName);
    // children.forEach(item => {
    //   console.log(item);
    // });
    updateChildrenInEnFile(card, children);
  });


  let searchData = excelData[Object.keys(excelData)[1]];
  searchData.forEach(item => {
    let searchObject = getObjectByName(item.number);
    if (searchObject != null) {
      replaceTextInEnFile(searchObject.id + '.label', 'TextToReplace', item.name);

      let clickItemId = searchObject.click.substring(searchObject.click.indexOf('LinkBehaviour'), searchObject.click.indexOf('.source'));
      replaceTextInEnFile(clickItemId + '.source', 'UrlToReplace', item.link);
    }  
  });

  updateEnFile('upload/en.txt');
  updateScript_mobileFile('upload/script_mobile.js');
  updateOutputFile('upload/test.xlsx');
}

function updateOutputFile(filePath) {
  const workBook = xlsxFile.readFile(filePath);
  const workSheet = workBook.Sheets["Sheet2"];
  const data = xlsxFile.utils.sheet_to_json(workSheet);

  let outputFileContent = '';
  const newData = data.map(function newWb (line) {
    line1 = line.Name;
    line2 = line.Link;
    outputFileContent += `<a href="${line2}"onclick="myFunction()">${line1}</a>` + '\n';
 });

  fs.writeFileSync('output.txt', outputFileContent, function (err) {
    if (err) throw err;
  });
}

function getDataFromExcelFile(filePath) {
  let excelData = excelToJson({
    sourceFile: filePath,
    sheets: [{
      name: 'Sheet1',
      header: { rows: 1 },
      columnToKey: {
          A: "cardName",
          B: "headerTitle",
          C: "subTitle",
          D: "youtubeLink",
          E: "productLink",
          F: "tsLink",
          G: "dmLink",
          H: "umLink",
          I: "ckLink",
          J: "photoLink"
      }
    },
    {
      name: 'Sheet2',
      header:{ rows: 1},
      columnToKey: {
        A: "number",
        B: "name",
        C: "link"
      }
    }]    
  })

  return excelData;
}

function getScriptFileContent(filePath) {
  return fs.readFileSync(filePath).toString();  
}

function parseFileContentToObject(fileContent, objectLetter) {
  let startOfObject = 'var ' + objectLetter + ' = {';
  let endOfObject = 'if (' + objectLetter + "['data'] == undefined)";
  const substring = fileContent.substring(fileContent.indexOf(startOfObject) + 8, fileContent.lastIndexOf(endOfObject) - 6);  
  let beautifyContent = beautify(substring, { indent_size: 4, space_in_empty_paren: true });

  let trimmedContent = ""; 
  let shouldDeleteLine = false;
  beautifyContent.toString().split(/\n/).forEach(function(line){
      if (line.includes('trans('))
      {
          line = line.replace('trans(', '"trans(');
          line = line.replace(')', ')"');
      }
      else if (line.includes('"this."'))
      {
        line = line.replace('"this."', '"this.",');
      }
      else if (line.includes("scripts"))
      {
        line = '\n';
        shouldDeleteLine = true;
      }
      else if (shouldDeleteLine)
      {
        if (line.includes('},'))
        {        
          shouldDeleteLine = false;
        }
        line = '\n';
      }
      trimmedContent += line;
    });

  // For Debug:

  fs.writeFileSync('beautyObjectD.json', beautifyContent, function (err) {
    if (err) throw err;
   });

  fs.writeFileSync('parseableObjectD.json', trimmedContent, function (err) {
    if (err) throw err;
   });

  return JSON.parse(trimmedContent);
}

function getCardChildren(cardName) {
  let children;
  objectD.definitions.forEach(card => {
    if (card.data != undefined && card.data.name != undefined && card.data.name == cardName)
    {
      children = card.children;  
    }
  });  
  return children;
}

function getObjectByName(itemName) {
  let object;
  objectD.definitions.forEach(item => {
    if (item.data != undefined && item.data.name != undefined && item.data.name == itemName)
    {
      object = item;  
    }
  });  
  return object;
}

function getChildObject(childId) {
  let childObject;
  objectD.definitions.forEach(object => {
    if (object.id != undefined && object.id == childId)
    {
      childObject = object;       
    }
  });  
  return childObject;
}

function replaceTextInEnFile(childId, titleToReplace, itemText) {
  if (itemText != undefined) {
    for (i = 0; i < enFileAsArray.length; i++)
    {
      if (enFileAsArray[i].includes(childId))
      {
        enFileAsArray[i] = enFileAsArray[i].replace(titleToReplace, itemText);
        return true;
      }
    }      
  }
  
  return false;
};

function updateChildrenInEnFile(card, children) {
  children.forEach((child) => {
    let childId = child.replace('this.', '');
    let foundId = false;
    if (childId.includes("Label_"))
    {
      foundId = replaceTextInEnFile(childId, 'HeaderTitle', card.headerTitle);
      if (foundId) {
        let iconButtonId = getLinkId(childId, 'LinkBehaviour');
        if (iconButtonId != '')
        {
          foundId = replaceTextInEnFile(iconButtonId, 'Product', card.productLink);
        }   
      }
    }

    foundId = replaceTextInEnFile(childId, 'SubTitle', card.subTitle);
    if (foundId) {
      return; 
    }

    if (childId.includes("IconButton_"))
    {
      let iconButtonId = getIconButtonId(childId, 'PopupWebFrameBehaviour');
      if (iconButtonId != '')
      {
        // if (card.youtubeLink != undefined) {
          
        // } 
        replaceTextInEnFile(iconButtonId, 'Youtube', card.youtubeLink);        
        replaceTextInEnFile(iconButtonId, 'Ts', card.tsLink);
        replaceTextInEnFile(iconButtonId, 'Dm', card.dmLink);
        replaceTextInEnFile(iconButtonId, 'Um', card.umLink);
        replaceTextInEnFile(iconButtonId, 'Ck', card.ckLink);
        replaceTextInEnFile(iconButtonId, 'Pic', card.photoLink);
      }  
      // else {
      //   changeVisibilty(childId, 'video-grey');
      // } 
    }
    
    if (childId.includes("IconButton_"))
    {
      if (card.youtubeLink == undefined) {
        changeVisibilty(childId, 'video-grey');
      }
      if (card.tsLink == undefined) {
        changeVisibilty(childId, 'ts-grey');
      }
      if (card.dmLink == undefined) {
        changeVisibilty(childId, 'diagram-grey');
      }
      if (card.umLink == undefined) {
        changeVisibilty(childId, 'um-grey');
      }
      if (card.ckLink == undefined) {
        changeVisibilty(childId, 'checklist-grey');
      }
      if (card.photoLink == undefined) {
        changeVisibilty(childId, 'photo-grey');
      }
    }
  });
}

function changeVisibilty(childId, imageName) {
  let childObject = getChildObject(childId);
  if (childObject != undefined && childObject.data != undefined && childObject.data.name == imageName) {
    
    childIndex = scriptFileContent.lastIndexOf(childId);    
    let substring = scriptFileContent.substring(childIndex - 7, childIndex);
    if (substring.includes('this')) {
      childIndex = scriptFileContent.indexOf(childId);
    }
    visibleIndex = scriptFileContent.indexOf('"visible"', childIndex);
    scriptFileContent = replaceAt(visibleIndex, '"visible":true ');          
  }
}

function replaceAt(index, replacement) {
  let substring = scriptFileContent.substring(index - 50, index + 50);
  // console.log(substring);
  return scriptFileContent.substring(0, index) + replacement + scriptFileContent.substring(index + replacement.length);
}


function getIconButtonId(childId, prefixIndication) {
  let childObject = getChildObject(childId);
  if (childObject != undefined && childObject.click != undefined)
  {
    let clickString = childObject.click;
    let imageButtonId = clickString.substring(clickString.indexOf(prefixIndication), clickString.indexOf('));') - 1);
    return imageButtonId;
  }
  return '';
}

function getLinkId(childId, prefixIndication) {
  let childObject = getChildObject(childId);
  if (childObject.click != undefined)
  {
    let clickString = childObject.click;
    let imageButtonId = clickString.substring(clickString.indexOf(prefixIndication), clickString.indexOf('),') - 1);
    return imageButtonId;
  }
  return '';
}


function updateEnFile(filePath) {
  let updatedEnFileContent;
  enFileAsArray.forEach(line => {
    updatedEnFileContent += line + '\n';
  });

  fs.writeFileSync(filePath, updatedEnFileContent, function (err) {
    if (err) throw err;
  });
}

function updateScript_mobileFile(filePath) {
  fs.writeFileSync(filePath, scriptFileContent, function (err) {
    if (err) throw err;
  });
}

// app.listen(process.env.PORT);
app.listen(3001, () => {
  console.log(`Server listening at http://localhost:3001`)
})