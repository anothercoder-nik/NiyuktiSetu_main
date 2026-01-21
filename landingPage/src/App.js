import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import LoginForm from "./pages/LoginForm";
import InterviewLogin from "./pages/InterviewLogin";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<LoginPage/>} />
            <Route path="/sign-up" element={<SignUpPage/>} />
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route 
              path="/login" 
              element={
                <ProtectedRoute>
                  <InterviewLogin/>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
