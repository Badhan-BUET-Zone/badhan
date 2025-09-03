// material-ui
import {Grid} from '@mui/material';

// project imports
import {gridSpacing} from '../../../store/customization/constant';
import MyMainCard from "../../../ui-component/cards/MyMainCard";

// ==============================|| DEFAULT DASHBOARD ||============================== //

const Dashboard = () => {
    return (
            <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                    <MyMainCard title={'Admin Console'}>
                        <p>Welcome to Badhan Admin Console</p>
                    </MyMainCard>
                </Grid>
            </Grid>
    );
};

export default Dashboard;
