import {BrowserRouter as Router,Routes,Route} from 'react-router-dom'
import './App.css'
import './Landingpage.css'
import './Createacoount.css'
import './ProfilePAge.css'
import Landingpage from './Pages/Landingpage'
import Createacoount from './Pages/Createacoount'
import ErrorBoundary from './Errorboundary'
import ProfilePAge from './Pages/ProfilePAge'
import ChatPage from './Pages/ChatPage'
function App() {


  return (
    <>
  <Router>
    <ErrorBoundary>
 <Routes>
  <Route path='/' element={<Landingpage/>}/>
 <Route path='/home' element={<Landingpage/>}/>
 <Route path='/home/createacoount' element={<Createacoount/>}/>
 <Route path='/home/profile' element={<ProfilePAge/>}/>
 <Route path='/home/send' element={<ChatPage/>}/>
 <Route path='/home/recive' element={<ChatPage/>}/>
    </Routes>
    </ErrorBoundary>
  </Router>
    </>
  )
}

export default App
