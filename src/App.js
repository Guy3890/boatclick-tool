import React from 'react';
import axios from 'axios';
import {Progress} from 'reactstrap';
import './App.css';

class App extends React.Component {
  render() {
  return (
    <div className="container">
      <div className="row">
        <div className="offset-md-3 col-md-6">

        <div className="form-group files">
          <label> Upload Your File </label>
          <input type="file" class="form-control" multiple onChange={this.onChangeHandler}/>
        </div>
        <div className="form-group">
      <Progress max="100" color="success" value={this.state.loaded} >{Math.round(this.state.loaded,2) }%</Progress>
      </div>
        <button type="button" class="btn btn-success btn-block" onClick={this.onClickHandler}>Run</button> 
     </div>
     </div>
    </div>
  );
}
onChangeHandler=event=>{
  this.setState({
   selectedFile: event.target.files,
  })
} 
constructor(props) {
  super(props);
    this.state = {
      selectedFile: null, 
      loaded:0
    }
}

onClickHandler = () => {
  const data = new FormData()
  for(var x = 0; x<this.state.selectedFile.length; x++) {
      data.append('file', this.state.selectedFile[x])
  }

axios.post("http://localhost:3001/upload", data, { 
      // receive two    parameter endpoint url ,form data
  })
.then(res => { // then print response status
    console.log(res.statusText)
 })

axios.post("http://localhost:3001/upload", data, {
       onUploadProgress: ProgressEvent => {
         this.setState({
           loaded: (ProgressEvent.loaded / ProgressEvent.total*100),
       })
   },
})
}
}




export default App;
