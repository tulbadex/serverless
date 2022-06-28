const AWS = require('aws-sdk')
AWS.config.update({
    region: 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient()
const dynamodbTableName = 'servelessq'

const blogPath = '/blogs'
const blogsPath = '/blog'


exports.handler = async function(event) {
    console.log('Requst event: ', event)
    let response;

    switch(true){
        case event.httpMethod === 'GET' && event.path === blogPath:
            response = await getBlog(event.queryStringParamters.id);
            break;
        case event.httpMethod === 'GET' && event.path === blogsPath:
            response = await getBlogs();
            break;
        case event.httpMethod === 'POST' && event.path === blogPath:
            response = await saveBlog(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === blogPath:
            let requestsBody = JSON.parse(event.body)
            response = await updateBlog(requestsBody.id, reqquestBody.updateKey, requestsBody.updateValue);
            break;
        case event.httpMethod === 'DELETE' && event.path === blogPath:
            response = await removeBlog(JSON.parse(event.body).id);
            break;
        default:
            response = buildResponse(404, '404 not found')
    }
    return response
}

async function getBlog(id){
    const params = {
        TableName: dynamodbTableName,
        key: {
            'id': id
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.item);
    }, (error) => {
        console.error('Error occur while fetch a single blog', error);
    });
}

async function getBlogs(){
    const params = {
        TableName: dynamodbTableName
    }
    const getAllBlogs = await scanDynamoDBRecords(params, []);
    const body = {
        'blogs': getAllBlogs
    }
    return buildResponse(200, body);
}

async function scanDynamoDBRecords(scanParams, itemArray){
    try{
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items)
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoDBRecords(scanParams, itemArray);
          }
          return itemArray;
    } catch(error) {
        console.error('Error occur while fetching all blogs: ', error);
    }
}

async function saveBlog(requestBody) {
    const params = {
      TableName: dynamodbTableName,
      Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
      const body = {
        Operation: 'SAVE',
        Message: 'SUCCESS',
        Item: requestBody
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Error occurs while saving blog: ', error);
    })
  }
  
  async function updateBlog(id, updateKey, updateValue) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'id': id
      },
      UpdateExpression: `set ${updateKey} = :value`,
      ExpressionAttributeValues: {
        ':value': updateValue
      },
      ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
      const body = {
        Operation: 'UPDATE',
        Message: 'SUCCESS',
        UpdatedAttributes: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Error occur while updating blog: ', error);
    })
  }
  
  async function removeBlog(id) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'id': id
      },
      ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
      const body = {
        Operation: 'DELETE',
        Message: 'SUCCESS',
        Item: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Error while delting post: ', error);
    })
  }
  
  function buildResponse(statusCode, body) {
    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  }

