import React from 'react'
import { Navigate } from "react-router-dom";
import {useSelector} from "react-redux";
import {UserProfileModel} from "../store/userProfile/userProfileModel";
const RestrictAuthorizedUser: React.FC<{children: JSX.Element}> = ({children }) => {
    const userProfile = useSelector((state: {userProfile: UserProfileModel}) => state.userProfile);
    if (!!userProfile.token) {
        return <Navigate to={'/'} replace />;
    }
    return children;
};
export default RestrictAuthorizedUser;

