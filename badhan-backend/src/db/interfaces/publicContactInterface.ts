// @ts-nocheck
const { PublicContact } = require('../models/PublicContacts')

const insertPublicContact = async (donorId, bloodGroup) => {
  const publicContact = new PublicContact({ donorId, bloodGroup })
  const data = await publicContact.save()

  if (data.nInserted === 0) {
    return {

      message: 'Public contact insertion failed',
      status: 'ERROR'
    }
  } else {
    return {
      data,
      message: 'Public contact insertion successful',
      status: 'OK'
    }
  }
}

const deletePublicContactById = async (publicContactId) => {
  const data = await PublicContact.findByIdAndDelete(publicContactId)
  if (data) {
    return {
      message: 'Public contact removed successfully',
      status: 'OK',
      data
    }
  }
  return {
    message: 'Could not remove public contact',
    status: 'ERROR'
  }
}

const findPublicContactById = async (publicContactId) => {
  const data = await PublicContact.findOne({
    _id: publicContactId
  })
  if (data) {
    return {
      data: data,
      message: 'Contact fetched successfully',
      status: 'OK'
    }
  }
  return {
    data: data,
    message: 'Contact not found',
    status: 'ERROR'
  }
}

const findAllPublicContacts = async () => {
  const data = await PublicContact.aggregate([
    {
      $lookup: {
        from: 'donors',
        localField: 'donorId',
        foreignField: '_id',
        as: 'donorDetails'
      }
    },
    {
      $project: {
        name: { $arrayElemAt: ['$donorDetails.name', 0] },
        donorId: '$donorId',
        bloodGroup: '$bloodGroup',
        contactId: '$_id',
        phone: { $arrayElemAt: ['$donorDetails.phone', 0] }
      }
    },
    {
      $group: {
        _id: {
          bloodGroup: '$bloodGroup'
        },
        contacts: { $push: { donorId: '$donorId', phone: '$phone', name: '$name', contactId: '$contactId' } }
      }
    },
    {
      $project: {
        _id: 0,
        bloodGroup: '$_id.bloodGroup',
        contacts: '$contacts'
      }
    },
    {
      $sort: {
        bloodGroup: 1
      }
    }
  ])
  return {
    data: data,
    message: 'All public contacts fetched',
    status: 'ERROR'
  }
}

module.exports = {
  insertPublicContact,
  deletePublicContactById,
  findPublicContactById,
  findAllPublicContacts
}
