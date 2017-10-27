import Joi from 'joi-browser';
import schema from '../validation';

export default class API {
  constructor(url) {
    this.url = url;
  }

  setBaseUrl(url) {
    this.url = url;
  }

  fetch(url, fetchData) {
    const headers = {
      headers: {
        "x-access-token": this.token || null,
        "Content-Type": "application/json"
      },
    };
    const fd = Object.assign({}, fetchData, headers);
    return fetch(`${this.url}${url}`, fd)
      .then(res => {
        const contentType = res.headers.get('Content-Type');
        if (contentType === 'application/json; charset=utf-8') {
          return res.json();
        }
        return res;
      })
      .then(data => {
        return data;
      })
      .catch(error => {
        return new HttpError(error);
      });
  }

  //GET /layer/:id
  getLayerById(id) {
    const { error } = Joi.validate({ id }, schema.getLayerById);

    if (error) {
      return error;
    }

    const url = `/layer/${id}`;

    return this.fetch(url);
  }

  //GET /layer
  getLayers(page) {
    const { error } = Joi.validate({ page }, schema.getLayers);

    if (error) {
      return error;
    }

    const url = `/layer/?page=${page}`;
    return this.fetch(url)
  }

  //GET /layer/:id/anchor
    getLayersAnchors(option) {
      const { error } = Joi.validate({ option }, schema.getLayersAnchor);

      if (error) {
        return error;
      }

      if ( option.latitude && option.longitude && option.elevation) {
        const qs = {
          latitude: option.latitude,
          longitude: option.longitude,
          elevation: option.elevation,
          radius: option.radius,
          page: option.page,
        };

        let esc = encodeURIComponent;
        const query = Object.keys(qs)
          .map(k => esc(k) + '=' + esc(qs[k]))
          .join('&');
        const url = /layer/${option.id}/anchor/?${query};

        return this.fetch(url);
      } else {
        const url = /layer/${option.id}/anchor/?page=${option.page};

        return this.fetch(url);
      }
    }

  // POST /layer/:id/anchor
  createAnchor(option) {

    const { error } = Joi.validate(option, schema.createAnchor);

    if (error) {
      return error;
    }

    const url = `/layer/${option.layerId}/anchor`;

    const fetchData = {
      method: 'post',
      body: JSON.stringify(option),
    };
    return this.fetch(url, fetchData);
  }

  // POST /anchor/:id/model-pose
  createObject(option) {
    const { error } = Joi.validate(option, schema.createObject);

    if (error) {
      return error;
    }

    const url = `/anchor/${option.id}/model-pose`;
    const fetchData = {
      method: 'post',
      body: JSON.stringify(option),
    };
    return this.fetch(url, fetchData);
  }

  //GET /anchor/:id
  getAnchorById(id) {
    const { error } = Joi.validate({ id }, schema.getAnchorById);

    if (error) {
      return error;
    }

    const url = `/anchor/${id}`;
    return this.fetch(url);
  }

  //GET /anchor/:id/model-pose
  getAnchorsModels(id, page) {
    const { error } = Joi.validate({ id, page }, schema.getAnchorsModels);

    if (error) {
      return error;
    }

    const url = `/anchor/${id}/model-pose/?page=${page}`;
    return this.fetch(url);
  }

  //PUT /anchor/:id/model-pose/:modelPoseId
  updateObject(option) {
    const { error } = Joi.validate(option, schema.updateObject);

    if (error) {
      return error;
    }

    const url = `/anchor/${option.id}/model-pose/${option.modelPoseId}`;
    const fetchData = {
      method: 'put',
      body: JSON.stringify({ transform: option.transform }),
    };
    return this.fetch(url, fetchData);
  }

  //DELETE /anchor/:id/models/:objectId
  deleteObject(id, modelPoseId) {
    const { error } = Joi.validate({ id, modelPoseId }, schema.deleteObject);

    if (error) {
      return error;
    }

    const url = `/anchor/${id}/model-pose/${modelPoseId}`;
    const fetchData = {
      method: 'delete',
    };
    return this.fetch(url, fetchData);
  }

  //GET /gallery
  getGalleries(page) {
    const { error } = Joi.validate({ page }, schema.getGalleries);

    if (error) {
      return error;
    }

    const url = `/gallery/?page=${page}`;
    return this.fetch(url);
  }

  //GET /gallery/:id
  getGalleryModels(id, page) {
    const { error } = Joi.validate({ id, page }, schema.getGalleryModels);

    if (error) {
      return error;
    }

    const url = `/gallery/${id}/?page=${page}`;
    return this.fetch(url);
  }

  //POST /account
  createUser(options) {
    const { error } = Joi.validate(options, schema.createUser);

    if (error) {
      return error;
    }

    const fetchData = {
      method: 'post',
      body: JSON.stringify(options),
    };

    const url = `/account`;
    const res = this.fetch(url, fetchData);

    res.then((res, rej) => {
      this.apiKey = res.user.apiKey;
    });

    return res;
  }

  //GET /account
  getUser(token) {
    const { error } = Joi.validate({ token }, schema.getUser);

    if (error) {
      return error;
    }

    const url = `/account`;
    return this.fetch(url);
  }

  //GET /account/:id
  getUserById(id) {
    const { error } = Joi.validate({ id }, schema.getUserById);

    if (error) {
      return error;
    }

    const url = `/account/${id}`;
    return this.fetch(url);
  }

  //GET /model/:id/model
  getModel(id) {
    const { error } = Joi.validate({ id }, schema.getModel);

    if (error) {
      return error;
    }

    const url = `/model/${id}/model`;
    return this.fetch(url);
  }

  //GET /model/:id
  getModelData(id) {
    const { error } = Joi.validate({ id }, schema.getModel);

    if (error) {
      return error;
    }

    const url = `/model/${id}`;
    return this.fetch(url);
  }
}
