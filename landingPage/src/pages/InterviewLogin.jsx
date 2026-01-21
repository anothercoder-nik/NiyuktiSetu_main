import HeaderBar from '@/components/HeaderBar'
import React from 'react'
import LoginForm from './LoginForm'
import ExitButton from '@/components/ExitButton'

const InterviewLogin = () => {
  return (
     <div className="App">
      <HeaderBar />
      <LoginForm />
      <ExitButton />
    </div>
  )
}

export default InterviewLogin