"use strict";
const axios = require("axios");

class ShareFileAPI {
  authenticate( auth = {
    subdomain:'', username:'', password:'', clientId:'', clientSecret:''
  } ) {
    return new Promise((resolve, reject) => {

      if(auth.subdomain === ''){
        throw Error('subdomain prop required')
      }
      if(auth.username === ''){
        throw Error('username prop required')
      }
      if(auth.password === ''){
        throw Error('password prop required')
      }
      if(auth.clientId === ''){
        throw Error('clientId prop required')
      }
      if(auth.clientSecret === ''){
        throw Error('clientSecret prop required')
      }


      this.apiPath = `https://${auth.subdomain}.sf-api.com/sf/v3`;

      const config = `grant_type=password&username=${auth.username}&password=${auth.password}&client_id=${auth.clientId}&client_secret=${auth.clientSecret}`;

      axios
        .post(`https://${auth.subdomain}.sharefile.com/oauth/token`, config, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .then((result) => {
          this.httpConfig = {
            headers: {
              authorization: "Bearer " + result.data.access_token,
            },
          };

          this.cfg = {}
          Object.assign(this.cfg,result.data)

          resolve(this.cfg);
        })
        .catch(err => {
          if (err.response && err.response.data && err.response.data.error_description) {
            reject(err.response.data.error_description);
          }
          reject(err);
        });
    });
  
  }

  async items(id) {
    const basePath = `${this.apiPath}/Items`;
    const idPath = id ? `(${id})` : "";
    const data = await axios
      .get(basePath + idPath, this.httpConfig)
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        throw Error(err.response);
      });
    return new SharefileItem(data, this.httpConfig);
  }
}

class SharefileItem {
  constructor(values = {}, httpConfig) {
    this.httpConfig = httpConfig;
    Object.assign(this, values);
  }

  download(
    redirect = false,
    includeAllVersions = false,
    includeDeleted = false
  ) {
    return axios
      .get(
        this.url +
          `/Download?redirect=${redirect}&includeallversions=${includeAllVersions}&includeDeleted=${includeDeleted}`,
        this.httpConfig
      )
      .then((res) => {
        if (redirect) {
          return res;
        } else {
          return new DownloadSpecification(res.data);
        }
      });
  }

  children(includeDeleted = false) {
    return axios
      .get(
        this.url + `/Children?includeDeleted=${includeDeleted}`,
        this.httpConfig
      )
      .then((res) => res.data.value.map((item) => new SharefileItem(item, this.httpConfig)));
  }

  async childBy(propName = "", propVal = "", includeDeleted = false) {
    const item = await this.children(includeDeleted).then((list) => {
      return list.find((item) => item[propName] === propVal);
    });
    return new SharefileItem(item, this.httpConfig);
  }

  async childByName(name, includeDeleted) {
    const item = await this.childBy("Name", name, includeDeleted);
    return new SharefileItem(item, this.httpConfig);
  }

  async childById(id, includeDeleted) {
    const item = await this.childBy("Id", id, includeDeleted);
    return new SharefileItem(item, this.httpConfig);
  }
}

class DownloadSpecification {
  constructor(
    values = {
      DownloadToken: "",
      DownloadUrl: "",
      DownloadPrepStatusURL: "",
      "odata.metadata": "",
      "odata.type": "",
    }
  ) {
    this.token = values.DownloadToken;
    this.url = values.DownloadUrl;
    this.prepStatus = values.DownloadPrepStatusURL;
    this.odata = {};
    this.odata.metadata = values["odata.metadata"];
    this.odata.type = values["odata.type"];
  }
}

module.exports = ShareFileAPI;
