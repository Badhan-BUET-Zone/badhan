db.logs.aggregate(
    [
        {
            $project: {
                dateString: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: {
                            $toDate: "$date"
                        },
                        timezone: "+06:00"
                    }
                },
            }
        },
        {
            $group: {
                _id: {
                    dateString: "$dateString",
                },
                count: {$sum: 1}
            }
        },
        { $sort : { "_id.dateString" : -1} }
    ]
    );

db.logs.aggregate([
    {
        $match:{
            date:{
                $gt: 1628704800000,
                $lt: 1628791200000
            }
        }
    },
    {
        $lookup:{
            from:'donors',
            localField:'donorId',
            foreignField:'_id',
            as: 'donorDetails'
        }
    },
    {
        $project:{
            name:"$donorDetails.name",
            donorId:"$donorId",
            hall: "$donorDetails.hall"
        }
    },
    {
        $group:{
            _id:{
                name:"$name",
                donorId:"$donorId",
                hall: "$hall"
            },
            count: {$sum: 1}
        }
    },
    {
        $sort:{
            count:-1
        }
    }
])

db.logs.aggregate([
    {
        $match:{
            date:{
                $gt: 1628704800000,
                $lt: 1628791200000
            },
            donorId: ObjectId('5e901d56effc5900177ced73')
        }
    },
    {
        $lookup:{
            from:'donors',
            localField:'donorId',
            foreignField:'_id',
            as: 'donorDetails'
        }
    },
    {
        $project:{
            date: "$date",
            operation: "$operation",
            details:"$details",
        }
    },
    {
        $sort:{
            date:-1
        }
    }
]);
