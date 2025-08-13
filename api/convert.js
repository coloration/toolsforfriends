// api/convert.js
const superagent = require('superagent');

const tbHost = 'http://v.zhetaoke.com:10000/api/';
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

// 如果需要可以加 decode 方法，这里先留空
function decode(req) {
  return { username: 'guest' };
}

async function convertTKL(req, res) {
  try {
    const { tkl, relation_id } = req.body;
    let askData = { ...tbConfig, tkl, signurl: 5 };
    if (relation_id) {
      askData.relation_id = relation_id;
      askData.pid = sPid;
    }

    const result = await superagent
      .get(`${tbHost}/open_gaoyongzhuanlian_tkl.ashx`)
      .query(askData);

    const resData = JSON.parse(result.text);
    if (resData.status === 200 && resData.content) {
      return res.status(200).json({
        code: CODE_SUCCESS,
        msg: '转换成功',
        data: resData.content[0]
      });
    } else {
      return res.status(200).json({
        code: CODE_ERROR,
        msg: resData.status || '转换失败',
        data: null
      });
    }
  } catch (err) {
    return res.status(500).json({ code: CODE_ERROR, msg: err.message });
  }
}

async function convertJDKL(req, res) {
  try {
    const { oUrl, positionId } = req.body;
    let query = {
      appkey: tbConfig.appkey,
      unionId: jdConfig.unionId,
      materialId: oUrl,
      signurl: '5'
    };
    if (positionId) query.positionId = positionId;

    const result = await superagent
      .post(`${tbHost}/open_jing_union_open_promotion_byunionid_get.ashx`)
      .query(query);

    let resData = JSON.parse(result.text);

    if (resData.status === 200 && resData.content) {
      return res.status(200).json({
        code: CODE_SUCCESS,
        msg: '转换成功',
        data: resData.content[0]
      });
    } else if (
      resData?.jd_union_open_promotion_byunionid_get_response?.result &&
      resData?.jd_union_open_promotion_byunionid_get_response?.code == 0
    ) {
      // 再发一次请求
      const innerRes = JSON.parse(
        resData.jd_union_open_promotion_byunionid_get_response.result
      );
      if (innerRes.code == 200) {
        query.materialId = innerRes.data.shortURL;
        const retryResult = await superagent
          .post(`${tbHost}/open_jing_union_open_promotion_byunionid_get.ashx`)
          .query(query);
        const retryData = JSON.parse(retryResult.text);
        if (retryData.status === 200 && retryData.content) {
          return res.status(200).json({
            code: CODE_SUCCESS,
            msg: '转换成功',
            data: retryData.content[0]
          });
        }
      }
      return res
        .status(200)
        .json({ code: CODE_ERROR, msg: '京东链接转换失败', data: null });
    } else {
      return res
        .status(200)
        .json({ code: CODE_ERROR, msg: '京东链接转换失败', data: null });
    }
  } catch (err) {
    return res.status(500).json({ code: CODE_ERROR, msg: err.message });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: CODE_ERROR, msg: 'Method Not Allowed' });
  }

  const { type } = req.query; // ?type=tkl 或 ?type=jd
  if (type === 'tkl') {
    return await convertTKL(req, res);
  } else if (type === 'jd') {
    return await convertJDKL(req, res);
  } else {
    return res
      .status(400)
      .json({ code: CODE_ERROR, msg: 'Invalid type parameter' });
  }
};
