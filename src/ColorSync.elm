module ColorSync exposing (..)

import Html exposing (Html, div)
import Html.Attributes exposing (class, style)

type alias Model = String

initialModel : Model
initialModel =
  "#FFF"

type Msg =
  ChangeColor String | Reset


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    ChangeColor newColor ->
      ( Debug.log "new color here" newColor, Cmd.none )

    Reset ->
      ( initialModel, Cmd.none )


view : Model -> Html Msg
view model =
  div [class "color-sync", style [("background-color", model)]]
    [
      div [class "color-selector"]
      []
    ]
