import { ErrorMessage, Formik } from 'formik'
import { observer } from 'mobx-react-lite'
import React from 'react'
import { Button, Form, Header, Label } from 'semantic-ui-react'
import { useStore } from '../../app/api/stores/Store'
import MyTextInput from '../../app/common/form/MyTextInput'
import * as Yup from 'yup'
import ValidationErrors from '../errors/ValidationErrors'

export default observer(function RegisterForm() {

    const {userStore} = useStore()

    return (
        <Formik
            initialValues={{displayName:"", username: "", email: "", password: "", error: null}}
            onSubmit={(values, {setErrors}) => 
                userStore.register(values).catch(error =>
                    setErrors({error})
                )
            }
            validationSchema={Yup.object({
                displayName: Yup.string().required(),
                username: Yup.string().required(),
                email: Yup.string().required().email(),
                password: Yup.string().required(),
            })}
        >
            {({handleSubmit, isSubmitting, errors, isValid, dirty}) => (
                <Form className="ui form error" onSubmit={handleSubmit} autoComplete="off">
                    <Header as="h2" content="Register to Reactivities" color="teal" />
                    <MyTextInput name="displayName" placeholder="Display Name" />
                    <MyTextInput name="username" placeholder="Username" />
                    <MyTextInput name="email" placeholder="Email" />
                    <MyTextInput name="password" placeholder="Password" type="password" />
                    <ErrorMessage
                        name="error"
                        render={() => <ValidationErrors errors={errors.error} />}
                    />
                    <Button disabled={!isValid || !dirty || isSubmitting} loading={isSubmitting} positive content="Register" type="submit" fluid />
                </Form>
            )}
        
        </Formik>
    )
})