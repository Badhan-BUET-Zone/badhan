// @ts-nocheck
// material-ui

// project imports
import MainCard from '../../ui-component/cards/MainCard';
import MyButton from "../../ui-component/MyButton";

// ==============================|| SAMPLE PAGE ||============================== //

const BackupRestore = () => (
    <MainCard title="Manage All Backups of Database">
        <MyButton text={'Create New Backup'} color={'primary'}/>
        <MyButton text={'Trim Backups'} color={'warning'}/>
    </MainCard>
);

export default BackupRestore;
