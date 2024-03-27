use('Badhan-Test');

db.donations.aggregate([
    {
        $project: {
            year: { $toString: { $year: { $toDate: "$date" } } },
            month: { $toString: { $month: { $toDate: "$date" } } }
        }
    },
    {
        $group: {
            _id: { year: "$year", month: "$month" },
            count: { $sum: 1 }
        }
    },
    {
        $group: {
            _id: "$_id.year",
            counts: {
                $push: {
                    k: "$_id.month",
                    v: "$count"
                }
            }
        }
    },
    {
        $addFields: {
            counts: { $arrayToObject: "$counts" }
        }
    },
    {
        $project: {
            _id: 0,
            year: "$_id",
            counts: 1
        }
    },
    {
        $group: {
            _id: null,
            years: {
                $push: {
                    k: "$year",
                    v: "$counts"
                }
            }
        }
    },
    {
        $replaceRoot: {
            newRoot: { $arrayToObject: "$years" }
        }
    }
])
