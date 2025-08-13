const superagent = require('superagent');

const tbHost = 'https://api.zhetaoke.com:10001/api';
const tbConfig = {
  appkey: 'aea199ac751a4cd0906302eae98a5652',
  sid: '37023',
  pid: 'mm_14134602_1185700493_111031000380'
};
const sPid = 'mm_14134602_1185700493_111031700399';

const jdConfig = {
  unionId: 1001896506,
  pid: '1001896506_4100306154_3003939459'
};

const CODE_SUCCESS = 0;
const CODE_ERROR = -1;

async function convertTKL(body) {
  const { tkl, relation_id } = body || {};
  if (!tkl) throw new Error('tkl不能为空');

  let askData = { ...tbConfig, tkl, signurl: 5 };
  if (relation_id) {
    askData.relation_id = relation_id;
    askData.pid = sPid;
  }

  const result = await superagent
    .get(`${tbHost}/open_gaoyongzhuanlian_tkl.ashx`)
    .query(askData)
    .timeout({ response: 8000, deadline: 10000 });

  let resData;
  try {
    resData = JSON.parse(result.text);
  } catch {
    throw new Error('TKL接口返回非JSON');
  }

  if (resData.status === 200 && resData.content?.length) {
    return resData.content[0];
  }
  throw new Error(resData.status || '转换失败');
}

async function convertJDKL(body) {
  const { oUrl, positionId } = body || {};
  if (!oUrl) throw new Error('oUrl不能为空');

  let query = {
    appkey: tbConfig.appkey,
    unionId: jdConfig.unionId,
    materialId: oUrl,
    signurl: '5'
  };
  if (positionId) query.positionId = positionId;

  const result = await superagent
    .post(`${tbHost}/open_jing_union_open_promotion_byunionid_get.ashx`)
    .query(query)
    .timeout({ response: 8000, deadline: 10000 });

  let resData;
  try {
    resData = JSON.parse(result.text);
  } catch {
    throw new Error('JD接口返回非JSON');
  }

  if (resData.status === 200 && resData.content?.length) {
    return resData.content[0];
  } else if (
    resData?.jd_union_open_promotion_byunionid_get_response?.result &&
    resData?.jd_union_open_promotion_byunionid_get_response?.code == 0
  ) {
    const innerRes = JSON.parse(
      resData.jd_union_open_promotion_byunionid_get_response.result
    );
    if (innerRes.code == 200) {
      query.materialId = innerRes.data.shortURL;
      const retryResult = await superagent
        .post(`${tbHost}/open_jing_union_open_promotion_byunionid_get.ashx`)
        .query(query)
        .timeout({ response: 8000, deadline: 10000 });
      const retryData = JSON.parse(retryResult.text);
      if (retryData.status === 200 && retryData.content?.length) {
        return retryData.content[0];
      }
    }
    throw new Error('京东链接转换失败');
  } else {
    throw new Error('京东链接转换失败');
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: CODE_ERROR, msg: 'Method Not Allowed' });
  }

  const { type } = req.query;

  try {
    let data;
    if (type === 'tkl') {
      data = await convertTKL(req.body);
    } else if (type === 'jd') {
      data = await convertJDKL(req.body);
    } else {
      return res.status(400).json({ code: CODE_ERROR, msg: 'Invalid type parameter' });
    }

    res.status(200).json({ code: CODE_SUCCESS, msg: '转换成功', data });
  } catch (err) {
    console.error('Function error:', err);
    res.status(500).json({ code: CODE_ERROR, msg: err.message, data: null });
  }
};
